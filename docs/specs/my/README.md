# "我的"模块规格（里程碑1）

## 模块定位

"我的"板块是个人与企业资料中心，为所有角色提供企业文档查阅、证书管理和到期提醒服务。

## 子模块依赖关系

```
                    ┌─────────────────┐
                    │ 企业微信 OAuth2  │
                    │ (身份认证)       │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
      ┌──────────────┐  ┌─────────┐  ┌──────────────┐
      │  5.1 企业资料 │  │ 5.6 设置│  │  5.5 船舶监控 │
      └──────────────┘  └─────────┘  └──────────────┘
                                            ↑
              ┌──────────────┐     ┌────────┴─────────┐
              │  5.2 企业制度 │     │    vessels 表    │
              └──────────────┘     └──────────────────┘
                                            ↑
      ┌─────────────────────────────────────┤
      │                                     │
      ↓                                     │
┌──────────────┐   ┌──────────────────────────────┐
│  5.3 电子证照 │ → │  5.4 证书提醒（依赖证照到期日）│
└──────────────┘   └──────────────────────────────┘
```

## 规格文档清单

| 层次 | 文件 | 状态 |
|---|---|---|
| **API** | `api/enterprise-profile-api.yaml` | 已完成 |
| **API** | `api/enterprise-policy-api.yaml` | 已完成 |
| **API** | `api/certificate-api.yaml` | 已完成 |
| **API** | `api/certificate-reminder-api.yaml` | 已完成 |
| **API** | `api/ship-monitor-api.yaml` | 已完成 |
| **API** | `api/settings-api.yaml` | 已完成 |
| **DB** | `db/schema.md` | 已完成 |
| **DB** | `db/vessels.md` | 已完成 |
| **DB** | `db/vehicles.md` | 已完成 |
| **DB** | `db/personnel.md` | 已完成 |
| **DB** | `db/certificate-types.md` | 已完成 |
| **DB** | `db/enterprise-profile.md` | 已完成 |
| **DB** | `db/enterprise-policy.md` | 已完成 |
| **DB** | `db/certificates.md` | 已完成 |
| **DB** | `db/certificate-reminders.md` | 已完成 |
| **DB** | `db/ship-monitors.md` | 已完成 |
| **DB** | `db/user-settings.md` | 已完成 |
| **State** | `state/store-structure.md` | 已完成 |
| **State** | `state/auth-slice.md` | 已完成 |
| **State** | `state/enterprise-slice.md` | 已完成 |
| **State** | `state/certificate-slice.md` | 已完成 |
| **State** | `state/reminder-slice.md` | 已完成 |
| **State** | `state/monitor-slice.md` | 已完成 |
| **State** | `state/settings-slice.md` | 已完成 |
| **UI** | `ui/page-map.md` | 已完成 |
| **UI** | `ui/enterprise-profile-page.md` | 已完成 |
| **UI** | `ui/enterprise-policy-page.md` | 已完成 |
| **UI** | `ui/certificate-list-page.md` | 已完成 |
| **UI** | `ui/certificate-detail-page.md` | 已完成 |
| **UI** | `ui/reminder-dashboard-page.md` | 已完成 |
| **UI** | `ui/monitor-page.md` | 已完成 |
| **UI** | `ui/settings-page.md` | 已完成 |

## 前置依赖规格

编写本模块前需先完成：
- `docs/specs/common/api-conventions.md`
- `docs/specs/common/db-conventions.md`
- `docs/specs/wecom/oauth2-spec.md`
- `docs/specs/common/file-upload-spec.md`
