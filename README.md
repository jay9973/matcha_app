# MATCHA Android App

MATCHA 웹앱(https://matcha-food.vercel.app)을 띄우는 안드로이드 WebView 래퍼 앱입니다.
React Native + Expo 기반. 마켓 배포 없이 자체 배포(APK)로 몇몇 사용자가 쓰는 앱입니다.

## 자동 업데이트 (구성 완료)

이 저장소는 **GitHub Actions로 push 시 APK를 자동 빌드 → GitHub Release에 업로드** 하며,
앱 실행 시 **새 버전을 확인해 업데이트 버튼을 제공**합니다.

### 동작 흐름

1. `main` 브랜치에 코드 push (또는 Actions 수동 실행)
2. GitHub Actions가 `expo prebuild` + `gradlew assembleDebug` 로 debug APK 빌드
3. 빌드된 APK(`matcha-<버전>.apk`)와 `latest.json`을 **GitHub Release**에 업로드
4. 앱이 실행되면 `api.github.com/repos/jay9973/matcha_app/releases/latest` 로 최신 버전 확인
5. 새 버전이 있으면 **"새 버전 사용 가능"** 알림 → **업데이트** 버튼
6. 업데이트 탭 → APK 다운로드 → 시스템 설치

### 전제 조건

- **저장소가 public**이어야 함 (앱이 GitHub API에 로그인 없이 접근하려면)
  - GitHub → Settings → Danger Zone → "Change repository visibility" → **Public**
- GitHub Actions의 `GITHUB_TOKEN`(자동)으로 릴리스 생성 (별도 secrets 불필요)

## 업데이트가 빌드되게 하려면

```bash
git add .
git commit -m "update"
git push origin main
```

push 시 Actions가 자동으로 빌드·배포합니다.
수동 실행: GitHub → Actions → Build & Release APK → Run workflow

### 버전 올리기

`app.json` 의 `version` 을 올리면 새 버전 태그로 릴리스됩니다.
예: `"version": "1.0.0"` → 작업 후 `"1.1.0"` 로 올리고 push.

## 로컬 실행

```bash
npm install
npx expo start
```

## 앱 구조

- `App.js` — WebView + 업데이트 체커
- `.github/workflows/build-apk.yml` — APK 자동 빌드/배포
- `app.json` — 앱 이름/버전/권한 설정

## 참고: 업데이트 방식

- **웹 콘텐츠**: 이미 `matcha-food.vercel.app`에 자동 배포되므로 APK 없이 항상 최신
- **네이티브 변경**(App.js, 아이콘 등): 위 workflow로 APK 자동 배포 → 앱의 업데이트 알림으로 설치

> ⚠️ debug APK는 서명(signing)이 없어 일부 기기에서 설치 시 확인이 필요할 수 있습니다.
> 마켓/대규모 배포용은 release 사인 구성(EAS) 추가 검토 필요.
