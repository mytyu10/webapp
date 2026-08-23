import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  sendVoiceCommand,
  VoiceCommandResponse,
  VoiceFollowupContext,
} from '../api/voiceApi';
import { fetchTasks, toggleTaskCompletion, createTask } from '../api/taskApi';
import { createEvent } from '../api/eventApi';
import { logger } from '../logger';

const CONTEXT = 'useVoiceCommand';

const SPEECH_LANG = 'ja-JP';
const SPEECH_RATE = 1.0;
const SPEECH_PITCH = 1.0;

/** 1日のミリ秒数 */
const ONE_DAY_MS = 86_400_000;
/** 1時間のミリ秒数 */
const ONE_HOUR_MS = 3_600_000;
/** フォローアップの最大往復回数 */
const MAX_FOLLOWUP_ROUNDS = 2;

/**
 * テキストを音声で読み上げる。
 * onEnd コールバックが指定された場合は発話完了後に呼ぶ
 */
function speakReply(text: string, onEnd?: () => void): void {
  if (!text || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = SPEECH_LANG;
  utter.rate = SPEECH_RATE;
  utter.pitch = SPEECH_PITCH;
  if (onEnd) {
    utter.onend = () => onEnd();
  }
  window.speechSynthesis.speak(utter);
}

/**
 * Web Speech API の型定義（ブラウザグローバル）
 * TypeScript の標準型定義には含まれないため手動定義する
 */
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

/** Web Speech API が使用可能かどうかを確認する */
export function isSpeechRecognitionSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition)
  );
}

/** useVoiceCommand フックの戻り値型 */
export interface UseVoiceCommandReturn {
  /** 録音中フラグ */
  isListening: boolean;
  /** バックエンド処理中フラグ */
  isProcessing: boolean;
  /** フォローアップ中フラグ（システムが追加情報を収集している） */
  isFollowingUp: boolean;
  /** 認識されたテキスト（最新） */
  transcript: string;
  /** エラーメッセージ */
  error: string | null;
  /** 録音を開始する */
  startListening: () => void;
  /** 録音を停止する */
  stopListening: () => void;
  /** エラーをクリアする */
  clearError: () => void;
}

/**
 * 音声コマンドフック
 * Web Speech API で音声をテキスト化し、バックエンドで解析してアクションを実行する。
 * create_task / create_event では needs_followup: true のとき自動的に追加質問を行う。
 * onSuccess コールバックでページのリロードをトリガーできる（タスク・予定作成後に一覧を更新するため）
 */
export function useVoiceCommand(onSuccess?: () => void): UseVoiceCommandReturn {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFollowingUp, setIsFollowingUp] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  /** フォローアップ状態（アクション・収集済みパラメーター・往復回数） */
  const followupRef = useRef<{
    action: string;
    collected_params: Record<string, unknown>;
    round: number;
  } | null>(null);

  const navigate = useNavigate();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const startListeningInternalRef = useRef<(() => void) | null>(null);

  /** フォローアップ状態をリセットする */
  const resetFollowup = useCallback((): void => {
    followupRef.current = null;
    setIsFollowingUp(false);
  }, []);

  /** SpeechRecognition インスタンスを生成して設定する */
  function createRecognition(): SpeechRecognition | null {
    if (!isSpeechRecognitionSupported()) return null;

    const SpeechRecognitionClass =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'ja-JP';
    recognition.continuous = false;
    recognition.interimResults = false;
    return recognition;
  }

  /** アクションを実行する（フォローアップ完了後に final_params で呼ばれる） */
  const executeAction = useCallback(
    async (response: VoiceCommandResponse): Promise<void> => {
      const { action } = response;
      // フォローアップ完了時は final_params を使用し、初回はそのまま params を使用
      const params = response.final_params ?? response.params;
      logger.info(CONTEXT, `アクション実行: action=${action}`);

      if (action === 'navigate') {
        const path = (params as { path?: string }).path;
        if (path) {
          navigate(path);
        }
        return;
      }

      if (action === 'cancel') {
        // キャンセルは正常終了（エラーなし）
        logger.info(CONTEXT, '音声コマンドがキャンセルされました');
        return;
      }

      if (action === 'create_task') {
        const p = params as {
          title?: string;
          description?: string;
          due_date?: string;
          priority?: 'HIGH' | 'MEDIUM' | 'LOW';
        };
        if (!p.title) {
          setError('タスクのタイトルが認識できませんでした');
          return;
        }
        await createTask({
          title: p.title,
          description: p.description ?? '',
          due_date: p.due_date ?? new Date(Date.now() + ONE_DAY_MS).toISOString(),
          assignees: [],
          priority: p.priority ?? 'MEDIUM',
        });
        logger.info(CONTEXT, `タスク作成成功: "${p.title}"`);
        if (onSuccess) onSuccess();
        return;
      }

      if (action === 'complete_task') {
        const p = params as { title?: string };
        if (!p.title) {
          setError('完了にするタスクのタイトルが認識できませんでした');
          return;
        }
        const tasks = await fetchTasks();
        const keyword = p.title.toLowerCase();
        const target = tasks.find((t) =>
          t.title.toLowerCase().includes(keyword),
        );
        if (!target) {
          setError(`「${p.title}」に一致するタスクが見つかりませんでした`);
          return;
        }
        if (target.is_completed) {
          setError(`「${target.title}」は既に完了済みです`);
          return;
        }
        await toggleTaskCompletion(target.id, true);
        logger.info(CONTEXT, `タスク完了: id=${target.id} "${target.title}"`);
        if (onSuccess) onSuccess();
        return;
      }

      if (action === 'create_event') {
        const p = params as {
          title?: string;
          start_at?: string;
          end_at?: string;
          description?: string;
        };
        if (!p.title || !p.start_at) {
          setError('予定のタイトルまたは開始日時が認識できませんでした');
          return;
        }
        const endAt =
          p.end_at ??
          new Date(
            new Date(p.start_at).getTime() + ONE_HOUR_MS,
          ).toISOString();
        await createEvent({
          title: p.title,
          description: p.description ?? '',
          start_at: p.start_at,
          end_at: endAt,
        });
        logger.info(CONTEXT, `予定作成成功: "${p.title}"`);
        if (onSuccess) onSuccess();
        return;
      }

      // unknown
      setError('コマンドを認識できませんでした。もう一度お試しください');
    },
    [navigate, onSuccess],
  );

  /**
   * バックエンドからのレスポンスを処理する。
   * needs_followup: true の場合はマイクを自動再起動してフォローアップを継続する
   */
  const handleResponse = useCallback(
    (response: VoiceCommandResponse): void => {
      const { action, needs_followup, collected_params, reply } = response;

      // フォローアップが必要な場合（create_task / create_event かつ情報が不足）
      if (
        needs_followup &&
        (action === 'create_task' || action === 'create_event') &&
        collected_params !== undefined
      ) {
        const currentRound = followupRef.current?.round ?? 0;

        // ラウンド上限に達した場合は現時点のパラメーターで強制登録
        if (currentRound >= MAX_FOLLOWUP_ROUNDS) {
          logger.info(
            CONTEXT,
            `フォローアップ上限到達(${MAX_FOLLOWUP_ROUNDS}回)。現在のパラメーターで登録します`,
          );
          resetFollowup();
          const forceResponse: VoiceCommandResponse = {
            ...response,
            needs_followup: false,
            final_params: collected_params,
          };
          speakReply(reply, () => {
            setIsProcessing(true);
            executeAction(forceResponse)
              .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : '処理に失敗しました';
                setError(message);
              })
              .finally(() => setIsProcessing(false));
          });
          return;
        }

        // フォローアップ状態を更新
        followupRef.current = {
          action,
          collected_params,
          round: currentRound + 1,
        };
        setIsFollowingUp(true);
        logger.info(
          CONTEXT,
          `フォローアップ継続: action=${action} round=${currentRound + 1}`,
        );

        // 発話完了後にマイクを自動再起動
        speakReply(reply, () => {
          logger.info(CONTEXT, 'フォローアップのためマイクを自動再起動します');
          startListeningInternalRef.current?.();
        });
        return;
      }

      // フォローアップ完了またはマルチターン不要なアクション
      resetFollowup();
      speakReply(reply);
      setIsProcessing(true);
      executeAction(response)
        .catch((err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : '音声コマンドの処理に失敗しました';
          setError(message);
          logger.warn(CONTEXT, `コマンド処理失敗: ${message}`);
        })
        .finally(() => setIsProcessing(false));
    },
    [executeAction, resetFollowup],
  );

  /**
   * 内部用の音声認識開始（フォローアップ自動再起動でも使用）
   */
  const startListeningInternal = useCallback((): void => {
    if (!isSpeechRecognitionSupported()) {
      setError('このブラウザは音声認識に対応していません');
      return;
    }

    const recognition = createRecognition();
    if (!recognition) return;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0];
      if (result && result[0]) {
        const text = result[0].transcript;
        setTranscript(text);
        logger.info(CONTEXT, `音声認識結果: "${text}"`);
        setIsListening(false);
        setIsProcessing(true);

        // フォローアップコンテキストを構築
        const context: VoiceFollowupContext | undefined = followupRef.current
          ? {
              action: followupRef.current.action,
              collected_params: followupRef.current.collected_params,
            }
          : undefined;

        sendVoiceCommand(text, context)
          .then((response) => {
            setIsProcessing(false);
            handleResponse(response);
          })
          .catch((err: unknown) => {
            const message =
              err instanceof Error
                ? err.message
                : '音声コマンドの処理に失敗しました';
            setError(message);
            logger.warn(CONTEXT, `コマンド処理失敗: ${message}`);
            resetFollowup();
            setIsProcessing(false);
          });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      logger.warn(CONTEXT, `音声認識エラー: ${event.error}`);
      if (event.error === 'aborted') {
        // Chrome の初回マイク初期化タイミング問題。自動リトライする
        logger.info(CONTEXT, '音声認識 aborted: リトライします');
        setTimeout(() => recognition.start(), 100);
        return;
      }
      if (event.error === 'no-speech') {
        setError('音声が認識されませんでした。もう一度お試しください');
      } else if (event.error === 'not-allowed') {
        setError('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください');
      } else {
        setError('音声認識エラーが発生しました');
      }
      setIsListening(false);
      resetFollowup();
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    logger.info(CONTEXT, '音声認識開始');
  }, [handleResponse, resetFollowup]);

  startListeningInternalRef.current = startListeningInternal;

  /** 録音を開始する（外部から呼ばれる） */
  const startListening = useCallback((): void => {
    setError(null);
    setTranscript('');
    resetFollowup();
    startListeningInternal();
  }, [startListeningInternal, resetFollowup]);

  /** 録音を停止する */
  const stopListening = useCallback((): void => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    resetFollowup();
    logger.info(CONTEXT, '音声認識停止');
  }, [resetFollowup]);

  /** エラーをクリアする */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /** アンマウント時に音声認識を停止する */
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    isProcessing,
    isFollowingUp,
    transcript,
    error,
    startListening,
    stopListening,
    clearError,
  };
}
