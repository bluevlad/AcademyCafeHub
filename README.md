# AcademyInsight

학원 온라인 평판 모니터링 시스템

주요 커뮤니티(네이버 카페, 다음 카페, 디시인사이드)에서 학원/강사 관련 게시글을 자동 수집하고 대시보드로 제공합니다.

## 주요 기능

- 멀티 소스 크롤링 (네이버 카페, 다음 카페, 디시인사이드)
- 학원별 키워드 기반 게시글 자동 수집
- 관리자 대시보드 (게시글 현황, 크롤링 상태 모니터링)
- 감성 분석 (예정)

## 사용 기술

| 구분 | 기술 |
|------|------|
| Frontend | React 18, Nginx |
| Backend | Node.js, Express |
| Database | MongoDB 6 |
| Crawling | axios, cheerio, Naver Search API, Kakao Search API |
| Infra | Docker Compose, GitHub Actions (CI/CD) |

## 문서

프로젝트 상세 문서는 [docs/](docs/README.md)를 참고하세요.
