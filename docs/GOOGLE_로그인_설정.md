# 구글 로그인 연결 가이드 (Supabase 방식)

> ⚠ **보류 중**: 팀 백엔드가 **Python 서버(`wow_server.py`)로 확정**되어 Supabase 자리를 대신합니다(노션 "백엔드 통합 안내"). 이 가이드는 **Supabase 를 쓰는 경우에만** 유효합니다. 구글 로그인 설정은 `Docs/Backend/WebUiServer.md` 를 먼저 확인하세요. 자세한 내용은 `docs/백엔드_통합_대응.md`.

**먼저 알아둘 점**
- 구글 로그인 코드는 **v6/v7(Supabase 연동 버전)** 에 들어 있습니다. Figma Make 에서 내려받은 원본 zip 에는 없습니다.
- **API 키 발급은 윤재님 계정으로만 가능**합니다 (구글 클라우드 · Supabase 로그인이 필요해서 제가 대신 만들 수 없습니다). 아래 순서대로 하시면 됩니다.
- **Client Secret 은 Supabase 대시보드에만** 넣습니다. 코드·`.env`·깃에는 절대 넣지 않습니다.

## 전체 흐름
```
[Google 로그인 버튼] → Supabase 인증 주소 → 구글 계정 선택 → Supabase 콜백 → 우리 앱(redirectTo)으로 복귀 → 세션 생성 → 로비
```
구글 첫 로그인 때는 DB 가 임시 닉네임(`Wiz_xxxxxx`)을 만들고, 로비에서 **닉네임 설정 창**이 뜹니다.

## 순서

### A. Supabase 준비
1. 프로젝트 생성 후 **SQL Editor** 에 `supabase/schema.sql` **최신본**을 실행합니다.
   - ⚠ 이전 버전은 구글로 처음 가입할 때 임시 닉네임이 13자라 `Database error saving new user` 로 **가입이 실패**합니다. 이번 버전에서 고쳤으니 다시 실행해주세요. (이미 실행했다면 파일 전체를 다시 Run 해도 됩니다. `create or replace` 라 안전합니다.)
2. **Project Settings → API** 에서 `Project URL` 과 `anon public` 키를 복사해 `.env` 에 넣습니다.
   ```
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

### B. 구글 클라우드에서 OAuth 클라이언트 만들기
1. https://console.cloud.google.com → 프로젝트 만들기/선택
2. **Google Auth Platform**(옛 이름: OAuth 동의 화면)에서 앱 이름, 지원 이메일을 입력하고 대상은 **외부(External)** 로 설정합니다.
   - 게시 상태가 **"테스트"** 이면 **테스트 사용자로 등록한 구글 계정만** 로그인할 수 있습니다. 팀원 계정을 모두 추가하세요.
3. **클라이언트(Clients) → 클라이언트 만들기 → 애플리케이션 유형: 웹 애플리케이션**
   - **승인된 리디렉션 URI**: `https://<프로젝트ID>.supabase.co/auth/v1/callback`
     (Supabase → Authentication → Sign In / Providers → Google 화면에 보이는 **Callback URL** 을 그대로 복사하는 게 가장 정확합니다.)
   - **승인된 JavaScript 원본**: `http://localhost:8443` (배포하면 배포 주소도 추가)
4. 만들기를 누르면 나오는 **Client ID** 와 **Client Secret** 을 복사합니다.

> 구글 콘솔 메뉴 이름은 자주 바뀝니다. Supabase 공식 문서(Login with Google)는 "Google Auth Platform 콘솔의 Clients 에서 웹 애플리케이션 유형의 OAuth 클라이언트 ID 를 만들고, 승인된 리디렉션 URI 에 Supabase 콜백 URL 을 추가"하라고 안내합니다.

### C. Supabase 에 구글 켜기
**Authentication → Sign In / Providers → Google** → Enable → Client ID, Client Secret 붙여넣기 → Save

### D. 돌아올 주소 허용
**Authentication → URL Configuration**
- **Site URL**: `http://localhost:8443`
- **Redirect URLs**: `http://localhost:8443/**` (배포 주소가 있으면 `https://배포주소/**` 도 추가)

앱은 로그인 후 `window.location.origin`(= 지금 접속한 주소)으로 돌아오게 되어 있어서, **접속 주소가 Redirect URLs 에 있어야** 합니다.

### E. 실행
```bash
npm run dev
```
로그인 화면의 **Google 계정으로 계속하기**를 누릅니다. (`.env` 가 없으면 Mock 모드라서 "Supabase 연결 후 사용" 안내가 뜹니다.)

## 문제 해결
| 증상 | 원인 | 해결 |
|---|---|---|
| 구글 화면에서 `redirect_uri_mismatch` | 구글 클라이언트의 리디렉션 URI 가 Supabase 콜백과 다름 | B-3 의 URI 를 Supabase 화면의 Callback URL 과 **글자 그대로** 맞추기 |
| 앱에 "Google 로그인이 아직 켜져 있지 않습니다" | Supabase 에서 Google provider 가 꺼져 있음 | C 단계 |
| 앱에 "돌아올 주소가 허용 목록에 없습니다" | 접속 주소가 Redirect URLs 에 없음 | D 단계 (`http://localhost:8443/**`) |
| "구글 로그인이 취소되었거나 허용되지 않았습니다" | 구글 콘솔이 "테스트" 상태인데 테스트 사용자가 아님 | B-2 에서 테스트 사용자 추가 |
| "가입 처리 중 데이터베이스 오류" | 예전 `schema.sql` 이 적용돼 있음 | A-1 최신본 재실행 |
| 로그인 후 다시 로그인 화면 | `.env` 의 URL/키가 다른 프로젝트이거나 dev 서버를 재시작하지 않음 | `.env` 확인 후 `npm run dev` 재시작 |

## 동작하지 않을 가능성이 높은 곳 (직접 확인하지 못함)
- **claude.ai 에 게시한 데모 링크**: 별도 도메인의 임베드 환경이라 구글 로그인이 막힐 가능성이 높습니다. 그 데모는 Mock 모드 전용입니다.
- **Quest 안의 앱(WebView)**: 구글은 임베디드 WebView 에서의 로그인을 막습니다. Quest 의 일반 브라우저라면 가능하지만, Unity 앱 안에서는 별도 방식(외부 브라우저·기기 코드 방식 등)이 필요합니다.

## 무엇을 검증했나
- ✅ 자동 테스트: 구글 인증 주소가 `…/auth/v1/authorize?provider=google&redirect_to=…&prompt=select_account` 로 만들어지는지, 설정 오류·로그인 실패 문구, 임시 닉네임이 DB 규칙(2~12자)을 넘지 않는지, 닉네임 설정 창 동작, 그리고 `schema.sql` 가입 트리거 가드
- ❌ **확인하지 못한 것**: 실제 구글 · Supabase 와의 왕복(키가 없고 외부 접속이 막혀 있음). 위 순서로 설정한 뒤 막히는 단계의 오류 문구를 알려주세요.
