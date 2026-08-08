# admin-password-reset（AUTH-004 Phase 1）

管理員重設員工登入密碼。

## 行為

- 驗證呼叫者 JWT；僅 `profiles.role` = `owner` | `manager`
- `auth.admin.updateUserById`（Service Role）更新密碼
- 更新 `profiles.must_change_password`
- 寫入 `audit_logs.action = RESET_PASSWORD`（**不**紀錄密碼）

## Body

```json
{
  "action": "reset_password",
  "employeeNo": "DG022601",
  "newPassword": "********",
  "mustChangePassword": true
}
```

## Deploy

```bash
supabase functions deploy admin-password-reset --project-ref <ref>
```

Secrets：沿用專案 `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` / `SUPABASE_URL`。
