# Android 本地复习提醒（Local Review Reminders）

本项目实现了**日历式本地通知**：不依赖任何服务器/FCM 推送，由 Android 系统闹钟（`AlarmManager`）在 App 完全关闭时也能触发复习提醒。

## 架构总览

```
React Web 层                         Capacitor 桥接                    Android 原生层
─────────────                       ──────────────                    ──────────────
复习/新增卡片
nextReview 时间戳 ────┐
                      └─▶ NotificationScheduler     ──▶ AlarmManager.setExact
                          (Capacitor Plugin, TS)        + 到点触发 Notification
                                                              │
                                      点击通知 ──▶ 打开 App 的 #/review ★──┘
```

- 排期时间戳仍由 Web 层 `src/scheduler.ts` 计算（现有逻辑，未改动）
- 原生层只需在 `AlarmManager` 登记该时间，到点发本地通知
- **零服务器依赖**，App 关闭也能提醒（与日历应用一致）

## 已新增/修改的 Web 层文件

| 文件 | 说明 |
|------|------|
| `capacitor.config.ts` | Capacitor 配置（appId `com.zhangdapeng.spaced`、webDir `dist`） |
| `src/nativeNotifications.ts` | Web↔原生桥接层；非原生环境自动降级为无操作 |
| `src/scheduler.ts` | `processReview` 后调用 `syncNativeSchedule` 同步下一次提醒 |
| `src/db.ts` | `addCard` 登记提醒、`deleteCard` 取消提醒 |
| `package.json` | 新增 `@capacitor/core` / `@capacitor/cli` / `@capacitor/android` |

## 已新增的原生层文件（Kotlin）

| 文件 | 说明 |
|------|------|
| `android-native/NotificationSchedulerPlugin.kt` | Capacitor 插件：`scheduleCard` / `cancelCard` / `requestPermission` |
| `android-native/AlarmReceiver.kt` | 到点触发本地通知，点击深链跳转 `#/review` |
| `android-native/DeepLinkHelper.kt` | 构造打开复习页的启动 Intent |
| `android-native/BootReceiver.kt` | 设备重启恢复闹钟（骨架） |
| `android-native/AndroidManifest.xml` | 所需权限与 receiver 声明（模板） |
| `android-native/build.gradle.example` | 原生依赖配置示例 |

## Google 登录（原生方式）

APK 内使用 **原生 Google Sign-In**（`@capacitor-firebase/authentication`），需在 Firebase 控制台完成以下一次性配置：

1. **添加 Android 应用**：项目设置 → 添加应用 → Android，包名填 `com.zhangdapeng.spaced`
2. **填写 SHA-1 指纹**：debug 签名可通过 `keytool` 获取后再填入；
3. **下载 `google-services.json`** 放到 `android/app/`（`build.gradle` 已自动检测并应用）
4. **启用 Google 登录**：Authentication → Sign-in method → 启用 Google

> 若登录时弹窗秒退或报 `DEVELOPER_ERROR`，通常是 SHA-1 与 Firebase 控制台登记的不匹配。

## 构建步骤（需要 Android SDK + Java 21 + Android Studio）

> Capitor 7 需要 Java 21（`JAVA_HOME` 指向 JDK 21，如 `/usr/lib/jvm/java-21-openjdk-amd64`），SDK 位置在 `android/local.properties`（`sdk.dir`）。

```bash
# 1. 安装依赖（已在 package.json 配置好版本）
pnpm install

# 2. 构建 Web 产物到 dist/（APK 打包需 CAPACITOR_BUILD=1 用相对资源路径）
export CAPACITOR_BUILD=1
pnpm build

# 3. 生成原生 Android 工程（首次执行一次）
pnpm exec cap add android

# 4. 将 android-native/ 里的 Kotlin 文件复制到 android/app/src/main/java/com/zhangdapeng/spaced/
cp android-native/NotificationSchedulerPlugin.kt \
   android-native/AlarmReceiver.kt \
   android-native/DeepLinkHelper.kt \
   android-native/BootReceiver.kt \
   android/app/src/main/java/com/zhangdapeng/spaced/

# 5. 合并权限到 android/app/src/main/AndroidManifest.xml
#    （见 android-native/AndroidManifest.xml 模板）

# 6. 确保 build.gradle 含 androidx.core 依赖
#    （见 android-native/build.gradle.example）

# 6b. Google 登录：将 google-services.json 放到 android/app/（见「Google 登录」章节）

# 7. 编译 / 运行
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
pnpm exec cap sync android   # 同步原生依赖与插件
cd android && ./gradlew assembleDebug   # 生成 APK
```

## 权限说明

- `SCHEDULE_EXACT_ALARM`：精确闹钟（Play 商店对此有政策限制；如被拒可改用 `setWindow`/`setInexactRepeating` 降级）
- `POST_NOTIFICATIONS`：Android 13+ 通知运行时权限，App 启动时通过 `requestPermission` 申请
- `RECEIVE_BOOT_COMPLETED`：重启后恢复排期

## 注意事项

- **通知小图标**：`AlarmReceiver` 引用了 `R.drawable.ic_stat_name`，需在原生工程的 `res/drawable/` 添加该图标（或用系统自带图标替换）。
- **Firebase 在线依赖**：复习数据在 Firestore。本地提醒触发时若离线仍可弹通知，但打开 App 需联网才能拉取卡片内容。
- **已有 Web 轮询通知**（`src/notifications.ts`）可保留或删除：原生版不依赖它也能工作。

## 验证清单

- [ ] App 关闭后，到点仍弹出复习通知
- [ ] 点击通知跳转到复习页
- [ ] 复习完成后，下一次提醒按新 `nextReview` 生效
- [ ] 删除卡片后提醒被取消
- [ ] 设备重启后提醒恢复（BootReceiver）
