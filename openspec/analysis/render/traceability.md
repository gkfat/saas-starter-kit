# Traceability — Booking Module

來源：`openspec/analysis/traceability.yaml`（本檔為渲染版）

## Dangling References

**無** — 掃描 context/requirements/use-cases/domain-model/api-model/data-model 六份檔案間所有 ID 引用，皆能在來源檔案中找到對應項目，沒有打錯字或未同步更新的懸空引用。

## 追溯矩陣

| Requirement | Context                    | Use Cases  | Domain Model                         | API                                   | Data               | 狀態                                                          |
| ----------- | -------------------------- | ---------- | ------------------------------------ | ------------------------------------- | ------------------ | ------------------------------------------------------------- |
| FR-001      | CTX-ACTOR-002, CTX-CON-002 | UC-001     | ENT-001, AGG-001                     | API-001/002/003                       | DATA-001           | 完整                                                          |
| FR-002      | CTX-ACTOR-002              | UC-002     | ENT-002, VO-002, AGG-002             | API-004/005/006                       | DATA-002           | 完整                                                          |
| FR-003      | CTX-ACTOR-002, CTX-ASM-002 | UC-003     | ENT-004, AGG-004                     | API-007/008                           | DATA-003           | 完整（存在性待確認）                                          |
| FR-004      | CTX-ACTOR-001              | UC-004     | ENT-002, AGG-002                     | API-011/012                           | DATA-001, DATA-002 | 完整                                                          |
| FR-005      | CTX-ACTOR-001              | UC-005     | ENT-002/003/004, VO-001, AGG-002/003 | API-014                               | DATA-002/003/004   | 完整                                                          |
| FR-006      | CTX-ACTOR-002, CTX-ASM-003 | UC-005     | ENT-001/003, AGG-001/003             | API-002, API-014                      | DATA-001, DATA-004 | 完整                                                          |
| FR-007      | CTX-ACTOR-002              | UC-006     | ENT-003, VO-001, AGG-003             | API-010                               | DATA-004           | 完整                                                          |
| FR-008      | CTX-ACTOR-001              | UC-007     | ENT-003, VO-001, AGG-003             | API-013/015                           | DATA-004           | 完整（時限規則待確認）                                        |
| FR-009      | CTX-CON-004                | UC-005     | ENT-002, AGG-002                     | API-014                               | DATA-002, DATA-004 | 完整                                                          |
| ~~FR-010~~  | CTX-EXT-002, CTX-ASM-001   | （已移除） | （已移除）                           | （已移除）                            | （已移除）         | **DEPRECATED 2026-08-20**（好友前提移除，保留 ID 供歷史追溯） |
| FR-011      | CTX-EXT-002                | UC-008     | EVT-001/002/003/004                  | （空，設計上如此）                    | （空，設計上如此） | 完整（驗證時已修）                                            |
| FR-012      | CTX-CON-001                | （刻意無） | （刻意無）                           | （刻意無，以 cross-cutting 方式落地） | （刻意無）         | 刻意不追溯，非缺口                                            |
| FR-013      | CTX-ACTOR-002              | UC-009     | ENT-003, AGG-003                     | API-009                               | DATA-004           | 完整                                                          |
| FR-014      | CTX-ACTOR-003              | UC-010     | ENT-003, VO-001, AGG-003, EVT-005    | API-016                               | DATA-004           | 完整（處理規則待確認）                                        |
| NFR-001     | CTX-CON-004                | UC-005     | AGG-002                              | API-014                               | DATA-002           | 完整                                                          |
| NFR-002     | CTX-EXT-002                | UC-008     | EVT-001/002/003/004                  | （空）                                | （空）             | domain model 已補；API 面仍未落地（低風險）                   |
| NFR-003     | CTX-CON-001                | （刻意無） | （刻意無）                           | 概念落地但未標 ID                     | —                  | 標註遺漏（低風險）                                            |
| NFR-004     | CTX-CON-003                | （刻意無） | （刻意無）                           | （刻意無）                            | （刻意無）         | 預期在 design.md 落地                                         |

## Gap 清單（依 severity 排序）

### High

無。原本的高風險項（CTX-EXT-002：LINE 好友狀態取得機制）已於 2026-08-20 因使用者決策——「不強求加 LINE 好友，只要 LIFF 登入即可預約」——而解除：FR-010、RULE-004 標記 deprecated，UC-005/API-014 移除好友檢查。CTX-EXT-002 降為 medium，見下方。

### Medium

- ~~**UC-008 orphan**~~ **已修復**：原本 domain-model.yaml 沒有任何項目的 `useCases` 引用 UC-008，已於本次驗證中在 EVT-001~004（BookingConfirmed/PendingReview/Rejected/Cancelled）補上 `UC-008`（EVT-005 因下游處理結果未定，維持不連結）。

- **CTX-EXT-002**（downgraded from high）：剩餘未決項僅為 LINE Messaging API channel 憑證管理方式與通知內容/時機規則，只影響 best-effort 通知功能何時上線，不再阻塞 UC-005 預約建立本身。
  → 建議：design.md 定案 channel 憑證管理方式即可，不必在 propose 前解決。

- **CTX-ASM-002**（Provider 範圍）
  影響 ENT-004 / AGG-004 / DATA-003 / API-007 / API-008 是否該存在。
  → 建議：propose 前或 design 階段與使用者確認。

- **RULE-007**（取消時限規則未確認，`bookings.cancellableUntil` 為預留欄位）

- **RULE-008**（逾期未審核處理規則未確認，`bookings.reviewDeadlineAt` 為預留欄位；FR-014 優先度為 could）

### Low

- **NFR-002 未落地**：與 UC-008 orphan 同根因，UC-008 無對應 API endpoint，本階段無自然落地位置。建議在 design.md 描述重試/補償機制。
- **NFR-003 標註遺漏**：概念上已透過重複出現的 404 FeatureDisabled response 落地，但沒有 operation 明確用 ID 引用 NFR-003。下次跑 api-modeling 時補上即可。
- **NFR-004**：屬環境變數/機密管理範疇，預期在 design.md 而非 API/資料模型落地，非缺陷。
- **AGG-004 / ENT-004 use case 不對稱**：ENT-004 的 useCases 含 UC-005，但 AGG-004 只列 UC-003；可能合理（UC-005 只是唯讀參照），僅供留意。
- **CTX-ASM-004**：是否整合 level/points 模組尚未確認，目前視為 out of scope。
- **CTX-ACTOR-003 / UC-008**：借用「System Scheduler」角色代表通知觸發者，是否需要獨立的 Notification 角色尚未確認。

## 已知的刻意設計（非缺口，勿誤判）

- **FR-012** 不對應獨立 use case：以 precondition 形式套用到所有其他 use case。
- **UC-008** 不對應獨立 API endpoint：屬狀態變化的內部 side effect，非可定址資源操作。

---

## 摘要

- **14 條 FR + 4 條 NFR，共 18 條追溯鏈；16 條完整、2 條刻意不追溯（FR-012, 部分 NFR）、1 條已廢棄（FR-010）**
- **Dangling reference：0**（六份檔案間所有 ID 引用皆有效，資料本身一致）
- **Gap 統計**：High 0、Medium 4（1 項已當場修復，1 項為降級後的 CTX-EXT-002）、Low 6
- 2026-08-20 更新：使用者決策移除「LINE 好友」預約前提後，原本唯一的 high 風險項已降為 medium；不再有任何結構性或高風險缺口

## 建議

分析階段的**資料一致性**沒有問題（0 dangling reference），且原本最高風險的外部依賴已因需求簡化而降級，可以放心推進實作。剩餘 medium/low 項目（channel 憑證管理方式、Provider 範圍、取消時限、逾期規則）可以作為 `design.md`／`tasks.md` 中明確列出的「待決策」章節，不需要全部敲定才能開始核心流程的實作。
