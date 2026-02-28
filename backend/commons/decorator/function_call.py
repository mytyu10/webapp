def log_function_call(func):
    def wrapper(*args, **kwargs):
        print(f"関数 {func.__name__} が呼び出されました")  # 関数の呼び出しを記録
        result = func(*args, **kwargs)  # 関数を実行
        print(f"関数 {func.__name__} が終了しました")  # 関数の終了を記録
        return result
    return wrapper