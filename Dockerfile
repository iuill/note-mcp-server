# ベースイメージとしてNode.js 20のalpine版を指定
FROM node:20-alpine

# 作業ディレクトリを設定
WORKDIR /usr/src/app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# TypeScriptをJavaScriptにコンパイル
RUN npm run build

# アプリケーションの実行コマンド
CMD [ "npm", "run", "start:refactored" ]
