# Letter Duet

두 사람이 하나의 세션을 만들고 캐릭터와 게시글, 공지, 로그를 함께 관리하는 실시간 웹 애플리케이션입니다.

## 주요 기능

- Firebase Authentication 이메일 로그인과 비밀번호 재설정
- 여러 세션룸 생성 및 참여, 진행/종료/삭제 상태 관리
- 캐릭터 시트와 프래그먼트 편집
- 실시간 게시글 작성, 수정, 삭제 및 시스템 메시지
- 공지사항과 세션 로그 페이지
- 전체 로그 TXT 내보내기

## 기술 스택

- React 19, TypeScript, Vite
- Firebase Authentication, Cloud Firestore
- React Router, React Markdown, Lucide React

## 로컬 실행

Node.js와 Firebase 프로젝트가 필요합니다.

```bash
npm install
cp .env.example .env.local
npm run dev:https
```

`.env.local`에 Firebase 웹 앱 설정값을 입력합니다. 이 파일은 Git에서 제외됩니다.

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## 빌드 및 배포

```bash
npm run build
npx firebase deploy --only firestore:rules
```

Firestore 권한 정책은 `firestore.rules`에서 관리합니다.

공개 배포용 파일을 만들 때는 로컬 Firebase 설정을 포함하지 않는 전용 빌드를 사용합니다.

```bash
npm run build:dist
```

## 빌드된 파일로 GitHub Pages 배포

미리 빌드된 `dist`를 받았다면 Node.js나 터미널 없이 배포할 수 있습니다.

1. `dist/firebase-config.json`을 텍스트 편집기로 엽니다.
2. Firebase Console의 웹 앱 설정값을 각 항목에 입력합니다.
3. GitHub에서 새 저장소를 만들고 `dist` 안의 파일과 폴더를 저장소 최상단에 업로드합니다.
4. 저장소의 **Settings > Pages**에서 `Deploy from a branch`를 선택합니다.
5. 배포 대상으로 `main` 브랜치와 `/ (root)`를 선택합니다.
6. Firebase Console의 **Authentication > Settings > Authorized domains**에 `사용자명.github.io`를 추가합니다.
7. Firebase Console의 Firestore **Rules** 화면에 `firestore.rules` 내용을 붙여넣고 게시합니다.

배포 파일은 다음 구조를 유지해야 합니다.

```text
index.html
firebase-config.json
style.css
assets/
```

GitHub Pages 주소는 `https://사용자명.github.io/저장소명/` 형식이며, 앱 화면 주소는 `/#/` 뒤에 표시됩니다. `firebase-config.json`의 Firebase 웹 설정값은 브라우저에서 사용하는 공개 설정입니다. 데이터 접근 권한은 반드시 함께 제공된 Firestore Rules로 보호해야 합니다.

기본 애플리케이션 스타일은 `style.css`에서 직접 수정할 수 있습니다.
