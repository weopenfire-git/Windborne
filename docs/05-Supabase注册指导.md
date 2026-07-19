# Supabase 项目注册指导

> 目标：5 分钟内创建好 Windborne 后端所需的 Supabase 项目

---

## Step 1 · 注册 Supabase 账号

1. 打开 https://supabase.com/
2. 右上角点击 **「Start your project」**
3. 用 **GitHub 账号**登录（推荐，免去再记一个密码）
   - 点「Continue with GitHub」
   - 授权 Supabase 访问你的 GitHub（只读基础信息，不会动你的代码）
4. 完成后会跳转到 Supabase Dashboard

> 如果不想用 GitHub，也可以用邮箱注册，但 GitHub 登录更快。

---

## Step 2 · 创建新项目

1. 在 Dashboard 首页点击 **「New project」**
2. 填写项目信息：

| 字段 | 填什么 | 说明 |
|------|--------|------|
| **Name** | `windborne` | 项目名，小写 |
| **Database Password** | 自己设一个强密码 | **务必记下来**，后面要用 |
| **Region** | `Southeast Asia (Singapore)` | 选新加坡，离中国最近 |
| **Pricing Plan** | `Free` | 免费档够用 |

3. 点 **「Create new project」**
4. 等待约 1-2 分钟，状态从 "Setting up" 变为 "Ready"

---

## Step 3 · 获取 API Key

项目创建完成后，我们需要拿到 3 个关键信息：

1. 在左侧菜单点 **「Project Settings」**（齿轮图标）
2. 点 **「API」**
3. 你会看到：

| 信息 | 说明 | 示例 |
|------|------|------|
| **Project URL** | 项目地址 | `https://xxxxxxxxxxxx.supabase.co` |
| **anon public key** | 客户端用的公开 key（可暴露） | `eyJhbGciOi...`（很长一串） |
| **service_role key** | 服务端用的私密 key（**绝不暴露**） | `eyJhbGciOi...`（另一串） |

4. **把这三个值发给我**（service_role key 我只在服务端用，不会写进前端代码）

---

## Step 4 · 配置认证方式

1. 左侧菜单点 **「Authentication」**
2. 点 **「Providers」**
3. 确认 **Email** 已启用（默认开启）
4. （可选）点 **GitHub** 启用 GitHub OAuth：
   - 需要 GitHub OAuth App，P0 先跳过，P1 再加

---

## Step 5 · 告诉我

完成上面 4 步后，把以下 3 个值发给我：

```
Project URL: https://xxxxxxxxxxxx.supabase.co
anon key: eyJxxx...
service_role key: eyJxxx...
```

我收到后会：
1. 配置好本地的 `.env.local`
2. 执行数据库迁移脚本（建表 + RLS + 触发器）
3. 验证数据库可用
4. 给你第一份接口文档 + 测试用例

---

## 常见问题

### Q: 免费档够用吗？

够。免费档提供：
- 500MB 数据库（P0 预计用不到 10MB）
- 1GB 文件存储（机票图片，P0 够用）
- 50000 月活用户（P0 几个人完全够）
- 每日自动备份

### Q: 密码忘了怎么办？

Supabase Dashboard → Project Settings → Database → Reset database password。注意这会重置整个数据库的密码，不影响数据。

### Q: 区域选错了能改吗？

不能直接改，需要新建项目迁移。所以一开始就选 **Singapore**。

### Q: 会不会扣费？

免费档不会扣费，没有信用卡也不会扣。超出免费额度会暂停服务，不会自动收费。

---

_完成注册后把 3 个值发给我，我继续推进。_
