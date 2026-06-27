# Docker構成

## 概要

`docker compose up --build` 一発でフロントエンド・バックエンド・DBを含む開発環境全体を起動できる。
SQLiteデータはnamed volumeで永続化され、コンテナを再起動してもデータは保持される。

## 作成・変更ファイル

| ファイル | 種別 | 役割 |
|---------|------|------|
| `docker-compose.yml` | 新規 | サービス定義・ポートマッピング・ボリューム |
| `backend/Dockerfile` | 新規 | バックエンドイメージビルド定義 |
| `backend/.dockerignore` | 新規 | イメージに含めないファイルの除外設定 |
| `frontend/Dockerfile` | 新規 | フロントエンドイメージビルド定義 |
| `frontend/.dockerignore` | 新規 | イメージに含めないファイルの除外設定 |

## 起動手順

```bash
# 初回・Dockerfile変更後
docker compose up --build

# 2回目以降
docker compose up

# バックグラウンド起動
docker compose up -d

# 停止
docker compose down

# 停止＋DBボリューム削除（データリセット）
docker compose down -v
```

起動後のアクセス先:

| サービス | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |

## docker-compose.yml 構成

```
webapp/
└── docker-compose.yml    ← ルートに配置
```

```yaml
services:
  backend:
    build:
      context: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env       # ホストの.envを環境変数として注入
    environment:
      DATABASE_URL: file:/data/dev.db   # .envのDATABASE_URLを上書き
    volumes:
      - ./backend/src:/app/src          # ホットリロード用ソースマウント
      - db-data:/data                   # SQLiteデータ永続化

  frontend:
    build:
      context: ./frontend
    ports:
      - "3000:3000"
    environment:
      HOST: "0.0.0.0"
      REACT_APP_API_SCHEME: http
      REACT_APP_API_HOST: localhost
      REACT_APP_API_PORT: "8000"
      CHOKIDAR_USEPOLLING: "true"
      WATCHPACK_POLLING: "true"
      WDS_SOCKET_HOST: localhost
      WDS_SOCKET_PORT: "0"
    volumes:
      - ./frontend/src:/app/src         # ホットリロード用ソースマウント
      - ./frontend/public:/app/public
    depends_on:
      - backend

volumes:
  db-data:
```

## バックエンド Dockerfile

```dockerfile
FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm ci                         # better-sqlite3などのネイティブモジュールをコンテナ向けにコンパイル

COPY . .

RUN npx prisma generate            # Prismaクライアント生成

EXPOSE 8000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:dev"]
```

起動時に `prisma migrate deploy` を実行してから NestJS dev server を起動する。
未適用マイグレーションが自動で反映される。

## フロントエンド Dockerfile

```dockerfile
FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

## フロントエンドのAPI接続方式

ローカル開発（Docker外）では `REACT_APP_API_HOST` が未設定のため `API_BASE = ''`（空文字）になり、
`package.json` の `proxy` 設定経由でバックエンドへ疎通する。

Docker環境では以下の環境変数を docker-compose で注入することで、
ブラウザが直接 `http://localhost:8000` へアクセスする方式に切り替わる。

```
REACT_APP_API_SCHEME=http
REACT_APP_API_HOST=localhost
REACT_APP_API_PORT=8000
```

ブラウザ → `localhost:3000`（フロントエンドコンテナ）
ブラウザ → `localhost:8000`（バックエンドコンテナ、ポートマッピング経由）

コンテナ間通信は使用しない（フロントエンドはSSRではなくブラウザで動作するため）。

## SQLiteデータの永続化

```
コンテナ内:  /data/dev.db
↕ named volume: db-data
ホスト:      Dockerが管理する領域に保存
```

`docker compose down` ではボリュームは削除されない。
`docker compose down -v` を実行するとボリュームごと削除される（データリセット）。

## ホットリロードの仕組み

### バックエンド

`./backend/src` をコンテナの `/app/src` にマウント。
NestJS の `npm run start:dev`（`nest start --watch`）がファイル変更を検知して再コンパイルする。
`node_modules` はコンテナ内のものを使用（マウントしない）。

### フロントエンド

`./frontend/src` および `./frontend/public` をマウント。
CRAのwebpack dev serverがファイル変更を検知する。

DockerではOSのファイルシステムイベントが伝播しないことがあるため、ポーリング方式を使用:

| 環境変数 | 対象 | 説明 |
|---------|------|------|
| `CHOKIDAR_USEPOLLING=true` | NestJS watch | chokidarのポーリングモード有効化 |
| `WATCHPACK_POLLING=true` | webpack (CRA) | watchpackのポーリングモード有効化 |

## シークレットの扱い

`backend/.env` はホスト上にのみ存在し、`backend/.dockerignore` でイメージに含めない。
docker-compose の `env_file: ./backend/.env` がホストファイルを読み込み、コンテナ起動時に環境変数として注入する。

```
backend/.dockerignore に含まれる除外対象:
- node_modules/
- dist/
- .env          ← シークレット（イメージ外で管理）
- .env.local
- coverage/
- agent-work/
- prisma/dev.db
```

## ネイティブモジュール（better-sqlite3）

`better-sqlite3` はC++のネイティブアドオンのため、`npm ci` 実行時にコンテナのアーキテクチャ向けにコンパイルされる。
`node:22`（Debian Bookworm）はコンパイルに必要な Python3・make・gcc を標準で含む。

Apple Silicon Mac（ARM64）でもDockerが `linux/arm64` イメージを自動選択してコンパイルするため、追加設定は不要。
