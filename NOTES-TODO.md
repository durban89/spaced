# Spaced — 待办 / 上下文存档（临时）

> 本文件用于跨会话续接，非正式文档。当前日期：2026-09-06。

## 项目一句话
Capacitor 7 打包 React+Vite+Firebase 间隔重复闪卡 Web 应用成 Android APK，
带原生本地通知提醒（AlarmManager）和原生 Google 登录。

## 当前状态（最新）
- 包名/应用名：`com.zhangdapeng.spaced` / `Spaced`
- 最新 debug APK：`android/app/build/outputs/apk/debug/app-debug.apk`（md5 `a2725a567d2c06f9d4b39bd2ac9386f3`）
- 通知权限：**已通**（用户真实复习提醒两天测试均正常弹出）
- **App 图标已定制**：蓝色 `#2563eb` 圆角方块 + 白色大脑（与 web favicon `public/favicon.svg` 一致），
  源文件在 `assets/*.svg`→`assets/icon-*.png`（sharp 渲染 1024px），手动生成各密度 mipmap；
  自适应图标背景色改为 `values/ic_launcher_background.xml`=`#2563eb`；删掉模板的青色网格
  `drawable/ic_launcher_background.xml`；通知小图标仍为白色铃铛 `ic_stat_name.xml`。
  注：`@capacitor/assets` 捆绑的 sharp@0.32.6 未编译无法使用，故手动生成。
- 2026-09-06 新增：
  - **BootReceiver 重启恢复**：`scheduleCard` 现在把排期持久化到 SharedPreferences，
    重启后 `BootReceiver` 调用 `restoreSchedulesAfterBoot` 自动重新注册（过滤已过期提醒）
  - **通知点击跳转复习页**：新增 `@capacitor/app@7` + manifest `app://zhangdapeng` VIEW intent-filter，
    App.tsx 监听 `appUrlOpen` 设置 hash 路由（修复原 deep link 只打开首页的问题）
  - **清理诊断 UI**：移除 DueNotify 顶部 `diag[...]` 蓝色诊断条和 "Test notif" 按钮
  - **addCard 不再立即触发闹钟**：新卡 `nextReview=now` 时不再 schedule（与 resync 逻辑一致）
  - **模板同步**：`android-native/` 已与 `android/app/...` 实际运行版对齐；
    README.ANDROID.md 去掉"cp 覆盖"引导（会回退）

## 待办 / 下一步
1. **用户回测新 APK**（关键变更多，建议重点验证）：
   - 卸载 → 装新 APK → 核对 md5 `a2725a567d2c06f9d4b39bd2ac9386f3`
   - 桌面图标应为「蓝底 + 白色大脑」（与 web 一致）
   - 做一次复习 → 到点弹通知
   - 测 **重启后提醒恢复**：设未来提醒 → 重启手机 → 到点是否仍弹（BootReceiver 重排）
   - 测 **点击通知跳转到复习页**（不再是首页）
2. **构建 release APK**（签名后交付，可选）
3. `android-native/` 目录仅作参考模板，以 `android/app/...` 实际运行版为准（BuildBootReceiver/插件逻辑已同步）。

## 用户设备
- 华为 / 荣耀（MTK）真机，用户自己 adb 安装测试（沙箱无设备）
- 测试要点：卸载 → 装新 APK → 核对 md5 → 电池设"无限制" + 开"自启动" → 做复习 → 等到点

## 关键技术点备忘
- 原生通知链路：复习卡片 `processReview` → `syncNativeSchedule` → `scheduleCardNotification`
  → 原生 `scheduleCard`（AlarmManager）。创建卡片 `addCard` 仅入库，不立即调度（原本会立即触发）。
- **精确闹钟权限坑**：Android 12+ 默认拒绝 `SCHEDULE_EXACT_ALARM`（华为/荣耀尤甚），
  已修复为 `canScheduleExactAlarms()` 检测 + 无权限自动降级 `setAndAllowWhileIdle`。
- **重启恢复**：原生层 `SharedPreferences`（`spaced_alarm_schedules`，JSON map cardId→{question,category,nextReviewMs}）
  由 `scheduleCard`/`cancelCard` 写入/删除；BootReceiver 重启后重排未来闹钟，过期项清除。
- **通知点击深链**：DeepLinkHelper 生成 `app://zhangdapeng/#/review?cardId=...`；
  manifest 已加 VIEW intent-filter（scheme `app` host `zhangdapeng`）；`@capacitor/app` 的
  `appUrlOpen` 在 App.tsx 监听，提取 `#` 后的 hash 交给 HashRouter（cardId 当前未被 Review 使用）。
- `checkAndNotify`（周期检查）用的是 Web `new Notification()`，在原生 WebView **不弹系统通知**，
  原生通知只走 AlarmManager 调度路径，二者分离。
- 登录后自动 `resyncAllSchedules` 重排所有未来提醒（兜底重启/杀进程）。
- web 构建必须 `CAPACITOR_BUILD=1` 输出相对 `./assets/` 路径（否则 APK 白屏）。
- Java 21（本机 `/usr/lib/jvm/java-21-openjdk-amd64`），Android SDK `/opt/android-sdk`（`android/local.properties`）。

## 常用命令
- 构建 APK：`export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 && cd android && ./gradlew assembleDebug`
- 重新构建 Web + sync：`CAPACITOR_BUILD=1 pnpm run build && pnpm exec cap sync android`
- 类型检查：`pnpm exec tsc -b --noEmit`
- lint：`pnpm exec oxlint`
