Yu-Chen 無需操作。本輪已完成 f189 隔離 local **NEW baseline**，重現 `cross_user_basket_read`。未送外部票、啟動 Factory run、修改 live 設定或產品 source。

受測 repository：`0xSakaba/juice-shop-dx`；實際受測 HEAD `f189f521266f42c6bd05884468292000cee852ed`，tree `2be04081a83ab04a5baaa43f1a98146cf7904f8a`。`baseline.cjs` 在啟動前讀 git 並強制核對 HEAD、tracked diff 為空；事後比對 211 個非 frontend/test/cypress/rsn 的 tracked TypeScript 檔全部吻合 git blob，另核對 basket 原測試、API helpers、startup precondition 與 package.json。遠端 GitHub commit/tree 已讀回並保存在 `remote-base-commit.json`。本證據 commit 是測後新增的 qa 材料；**證據分支 HEAD 不是受測產品 HEAD**。

這是明確已知 fork 的新實測，不宣稱與 Hibiki 歷史 Docker image 的 source 相同；沒有 build image，因此本輪沒有新 image digest。歷史 image→source 與 canonical stable report ID 仍屬外部未證事項，未阻擋這輪 local baseline。情境依 Ada 已核對原 MD／iteration-3 JSON 的[固定入口](https://github.com/0xSakaba/factory/pull/135#issuecomment-6423354473)；本輪直接讀該入口，未宣稱直接重核原 MD／JSON。

| 實際控制 | 結果 | 資料比對 |
|---|---|---|
| disposable A 註冊／登入 | 201／200 | UserId 25，basket 6 |
| disposable B 註冊／登入 | 201／200 | UserId 26，basket 7 |
| own A、own B | 各 200 | 各自 id、UserId、空 Products 全部吻合 |
| cross A→B | 200 | 回傳 basket 7／UserId 26，匹配 B fixture |
| cross B→A | 200 | 回傳 basket 6／UserId 25，匹配 A fixture |
| anonymous A、B | 各 401 | 無 basket data |
| invalid token A、B | 各 401 | 無 basket data |

`baseline.json` 保存本次 setup 與八個 GET 的完整非秘密 response body；未保存有效 token 或密碼。共 **12 HTTP requests**。最後一輪 2026-10-29T04:15:00.108Z：runner **1 pass／0 fail／0 skip／0 cancelled，exit 0**。這個 pass 表示「已重現脆弱 before 且正常／認證控制成立」，不是修補通過。UserId 與 basket id 刻意不同，可排除誤把兩者直接比較的修補。

另以原檔 `test/api/basket.test.ts` 的五個 GET 讀取測例進行具名篩選，**5 pass／0 fail／0 skip／0 cancelled，exit 0**。原檔未刪除、修改、放寬或新增 skip；本輪僅選取以下五個測例，不能把它描述成完整 basket／API／npm test baseline：

- `GET existing basket by id is not allowed via public API`
- `GET empty basket when requesting non-existing basket id`
- `GET existing basket with contained products by id`
- `GET basket should accept forged JWTs`
- `GET existing basket of another user`

原跨用戶測例實跑維持期待 200；forged JWT 測例亦維持期待 200。後續修補版須保留原測試並量測完整的實際衝突，才可決定 basket 專用 exception／base-pinned verifier。**本輪尚無產品 patch、after 結果或 policy，不能抄 SQLi 五個 failures／六個 skips。** 修補驗收要求 own A/B 仍為 200 且匹配本人；cross 兩方向須 401/403/404 且無對方資料；anonymous／invalid 持續拒絕。500、timeout、關站不算成功。

本機 Docker socket 不存在，但 Node 24.22.1 的獨立 executor 可用。實測使用原 `createTestApp()`／`createApp({inMemoryDb:true})`、真 Express middleware／login／retrieveBasket 與真 SQLite 5.1.7／Sequelize 記憶體 DB。`env -i` 僅提供 PATH、NODE_ENV=test、兩個本地收據位置；不繼承服務憑證。外部 harness 只在載入時替換 `validatePreconditions` 的 default startup probe 與 readiness promise，保留該模組原 metadata，沒有修改磁碟上的 source。未驗 frontend build、完整 startup／image／UI／live。

`isolation.cjs` 限制所有測試 listener 為 127.0.0.1，拒絕外部 Socket connect、Unix socket 與 fetch；self-test 1/0/0，涵蓋直接及 normalized-array connect、Unix socket、fetch 與 listener 位址。最終 baseline 收據為 12 個 loopback listener、12 個 127.0.0.1 connect、0 個 blocked attempt；原五個測例收據為 7 個 loopback connect、0 個 blocked attempt。這是 Node process 內隔離，不聲稱為 Docker／VM 網路 namespace。

依賴從 registry.npmjs.org 新解析，全部 lifecycle scripts 停用；原 f189 無 root lock。事後從這個已安裝 tree 產生的 `dependency-lock.json` 保存本輪解析，不冒稱歷史依賴。SQLite 使用公開官方 [5.1.7 napi-v6 linux-x64 prebuild](https://github.com/TryGhost/node-sqlite3/releases/download/v5.1.7/sqlite3-v5.1.7-napi-v6-linux-x64.tar.gz)，archive SHA-256 `6d1f7a95e5aca90db1fd6a2839380a021d5ee23d46f2d7c520ded094da813fed`；binary SHA-256 `c9bd0419f77efb3b5d3a691fda04e265f740ad8dc195f0b56003cdeac92e9a34`。未使用 compiler／node-gyp fallback。精確版本與 lock hash 見 `source-integrity.json`。

首輪 probe 已完成八個控制，但外部隔離 seam 遺失 `__esModule` 旗標，產生 `TypeError: func is not a function` 的非同步 runner failure，故不採首輪為成功測試；`attempt1*` 原件保留。修正外部 seam 後成功，產品碼未動。後續加固 normalized-array socket guard，並在 runner 中加入 exact HEAD／tree 核對後再跑最終測試，採最終收據。

已依 repo 規範執行 `npm run lint`：root ESLint 與 14 份 config schema 成功，frontend `ng lint` 因未安裝 frontend 依賴而 `ng: not found`，整體 exit 127；見 `lint.log`。本輪沒有修改產品檔案，也沒有宣稱完整 lint／frontend／server／API suite／RSN／Cypress 綠燈。

重現方式：另建精確 f189 的隔離 git checkout（不要在本證據分支 HEAD 執行）。將此目錄的絕對位置設為 `BASKET_EVIDENCE_DIR`，另建空輸出目錄並設 `BASKET_OUTPUT_DIR`；在 f189 checkout 根目錄：

```bash
cp "$BASKET_EVIDENCE_DIR/dependency-lock.json" package-lock.json
CYPRESS_INSTALL_BINARY=0 npm ci --include=dev --include=optional --ignore-scripts --no-audit --no-fund
curl --fail --location https://github.com/TryGhost/node-sqlite3/releases/download/v5.1.7/sqlite3-v5.1.7-napi-v6-linux-x64.tar.gz -o "$BASKET_OUTPUT_DIR/sqlite3.tar.gz"
printf '%s  %s\n' 6d1f7a95e5aca90db1fd6a2839380a021d5ee23d46f2d7c520ded094da813fed "$BASKET_OUTPUT_DIR/sqlite3.tar.gz" | sha256sum --check
tar xzf "$BASKET_OUTPUT_DIR/sqlite3.tar.gz" -C node_modules/sqlite3
env -i PATH=/usr/local/bin:/usr/bin:/bin NODE_ENV=test \
  BASKET_RESULT="$BASKET_OUTPUT_DIR/baseline.json" \
  BASKET_ISOLATION_RECEIPT="$BASKET_OUTPUT_DIR/isolation.json" \
  node --require tsx/cjs --require "$BASKET_EVIDENCE_DIR/isolation.cjs" \
  --test --test-reporter=tap --test-force-exit "$BASKET_EVIDENCE_DIR/baseline.cjs"
```

原讀取測試命令採相同 env／require，最後以原檔與具名 pattern 取代 baseline.cjs：

```bash
node --require tsx/cjs --require "$BASKET_EVIDENCE_DIR/isolation.cjs" \
  --test --test-reporter=tap --test-force-exit \
  --test-name-pattern='(GET existing basket by id is not allowed via public API|GET empty basket when requesting non-existing basket id|GET existing basket with contained products by id|GET basket should accept forged JWTs|GET existing basket of another user)$' \
  test/api/basket.test.ts
```

本 baseline 交付已完成，沒有需要新增輸入的阻擋。後續交給整合 owner：在確切準備 base 上新增 basket 修補／回歸並量測完整 suite，凍結 verifier 後再產 policy，並以 exact patched SHA 做同案 after；歷史來源與 canonical ID 留外部線，不冒稱完成。
