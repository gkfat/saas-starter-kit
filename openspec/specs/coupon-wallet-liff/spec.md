# Coupon Wallet (LIFF) Spec

## Purpose

Provides member-facing coupon wallet features in the LIFF app: listing held coupons by status, viewing coupon detail with QR code, and a home page card summarizing usable coupon count.

## Requirements

### Requirement: 會員可在 LIFF 端查看自己持有的優惠券

系統 SHALL 允許已登入的 LIFF 會員查詢自己持有的所有優惠券，並依狀態分類為可使用（未核銷且未過期）、已使用（`redeemedAt` 存在）、已過期（`expiresAt` 已過且未核銷）。

#### Scenario: 查看優惠券列表

- **WHEN** 已登入會員開啟「我的優惠券」頁面
- **THEN** 系統回傳該會員所有 `coupon_instances`，依可使用/已使用/已過期分類顯示

#### Scenario: 未登入查詢

- **WHEN** 未登入使用者呼叫優惠券列表 API
- **THEN** 系統回傳 401 並拒絕存取

### Requirement: 會員可查看優惠券詳情與 QR code

系統 SHALL 允許會員查看自己持有的單張優惠券詳情，包含標題、說明、到期日、序號，並於前端以序號內容產生 QR code 供到店出示。

#### Scenario: 查看自己持有的優惠券詳情

- **WHEN** 會員查詢自己持有的某張 `coupon_instances` 詳情
- **THEN** 系統回傳該券的標題、說明、到期日、序號

#### Scenario: 查看非自己持有的優惠券

- **WHEN** 會員嘗試查詢 `memberId` 非自己的優惠券詳情
- **THEN** 系統回傳 403 或 404，拒絕存取

### Requirement: LIFF 首頁顯示可使用優惠券數量卡片

系統 SHALL 在 LIFF 首頁顯示一張優惠券卡片，標示該會員目前可使用（未核銷且未過期）的優惠券數量，點擊後導向「我的優惠券」頁面。

#### Scenario: 有可使用優惠券

- **WHEN** 會員持有 2 張可使用的優惠券並開啟 LIFF 首頁
- **THEN** 首頁優惠券卡片顯示數量 2

#### Scenario: 無可使用優惠券

- **WHEN** 會員沒有任何可使用的優惠券並開啟 LIFF 首頁
- **THEN** 首頁優惠券卡片顯示數量 0，卡片仍正常呈現（不隱藏）
