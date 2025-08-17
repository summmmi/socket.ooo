# Arduino LED Controller

Arduino Nano 33 IoT를 위한 LED 컨트롤러 웹 애플리케이션입니다.

## 기능

- 웹 인터페이스에서 LED 색상 선택 (Red, Green, Blue)
- Supabase를 통한 색상 데이터 저장
- Arduino에서 GET API를 통해 현재 색상 조회

## 설정

1. 의존성 설치:
```bash
yarn install
```

2. 환경 변수 설정:
`.env` 파일을 생성하고 Supabase 설정을 추가하세요:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Supabase 테이블 생성:
```sql
CREATE TABLE led_colors (
  id SERIAL PRIMARY KEY,
  color VARCHAR(10) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

## 실행

### 개발 모드
```bash
yarn dev
```

### 빌드
```bash
yarn build
```

## API 엔드포인트

### GET /api/color
현재 설정된 LED 색상을 반환합니다.

**응답 예시:**
```json
{
  "color": "red",
  "timestamp": "2023-12-25T10:00:00.000Z"
}
```

## Arduino 연동

Arduino에서 다음과 같이 HTTP GET 요청을 보내 현재 색상을 가져올 수 있습니다:

```cpp
// GET 요청 예시
http.begin("https://your-domain.vercel.app/api/color");
int httpResponseCode = http.GET();
```

## 배포

Vercel에 배포하여 사용할 수 있습니다:

1. GitHub에 코드 푸시
2. Vercel에서 프로젝트 연결
3. 환경 변수 설정
4. 자동 배포 완료