# 臺北市立大學運動能力分析實驗室打卡系統

手機掃描 NFC Tag 的行動出勤 Web App。正式後臺採 Firebase Spark 免費方案。

## 目前可操作功能

- Google 帳號登入、待核准與系統總管權限
- NFC 簽到與簽退流程
- 重複掃描防止重複紀錄
- 個人及全體出勤紀錄
- 請假、補登及更正申請
- 異常與申請中心
- 出勤事件訊息中心
- 人員與 Tag 管理畫面
- CSV 匯出
- 響應式手機介面與 PWA 基礎

## NFC 網址參數

- 簽到：`?tag=lab-checkin`
- 簽退：`?tag=lab-checkout`

## Firebase 免費模式

- 使用 Spark 方案，不連結帳務帳戶。
- 使用 Authentication、Cloud Firestore 與 Security Rules。
- 不使用 Cloud Functions、Storage、付費簡訊或其他需 Blaze 的功能。
- 若免費額度耗盡，服務可能暫停；不得自行升級為付費方案。

## 安全邊界

正式版以 Google 帳號識別人員、以 NFC Tag 識別打卡位置，並由 Firestore 保存伺服器時間。固定 NFC 網址仍可能被轉傳，因此不能單獨當成絕對位置證明。正式人事使用前仍須完成實體手機驗收、個資告知、保存期限、備份與異常處理規範。

## 本機預覽

```bash
python3 -m http.server 4173
```

然後開啟 `http://localhost:4173`。
