# AcademyInsight - 개발 가이드

## 프로젝트 개요
AcademyInsight는 학원 강사들을 위한 온라인 평판 모니터링 시스템입니다. 주요 커뮤니티(네이버/다음 카페, 디시인사이드 등)에서 키워드 기반으로 게시글을 수집하고, AI 감성 분석을 통해 긍정/부정 여론을 파악하여 대시보드로 제공합니다.

## 시스템 아키텍처

### 주요 컴포넌트
1. **Data Collector** - 웹 크롤러 & 스크래퍼
2. **AI Analyzer** - 감성 분석 엔진 (NLP)
3. **Backend API** - 데이터 처리 & 비즈니스 로직
4. **Frontend Dashboard** - 사용자 인터페이스
5. **Notification Service** - 알림 시스템

### 기술 스택 제안

#### Backend
- **언어**: Python 3.10+
- **프레임워크**: FastAPI (비동기 처리 지원)
- **데이터베이스**: PostgreSQL (메인 데이터), Redis (캐싱 & 작업 큐)
- **스케줄러**: Celery + Celery Beat (주기적 크롤링)
- **NLP/AI**:
  - KoBERT, KoELECTRA (한국어 감성 분석)
  - Hugging Face Transformers
  - scikit-learn (키워드 추출)

#### Frontend
- **프레임워크**: React 18+ / Next.js
- **UI 라이브러리**: Material-UI / Ant Design
- **차트**: Chart.js / Recharts
- **상태 관리**: React Query + Zustand

#### 크롤링
- **라이브러리**:
  - Selenium (동적 페이지)
  - BeautifulSoup4 (정적 페이지)
  - Playwright (헤드리스 브라우저)
- **프록시**: Rotating Proxy Pool (IP 차단 방지)

#### 인프라
- **컨테이너**: Docker + Docker Compose
- **배포**: AWS (EC2, RDS, S3) / GCP
- **모니터링**: Prometheus + Grafana

## 데이터베이스 스키마

### 주요 테이블

```sql
-- 사용자 (강사)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 키워드 설정
CREATE TABLE keywords (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    keyword VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 크롤링 소스
CREATE TABLE sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- '네이버카페:공드림', 'DC:공갤' 등
    url VARCHAR(500) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'naver_cafe', 'daum_cafe', 'dcinside'
    is_active BOOLEAN DEFAULT true
);

-- 수집된 게시글
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    source_id INT REFERENCES sources(id),
    keyword_id INT REFERENCES keywords(id),
    title TEXT NOT NULL,
    content TEXT,
    author VARCHAR(100),
    post_url VARCHAR(500) UNIQUE NOT NULL,
    view_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    posted_at TIMESTAMP,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_posted_at (posted_at),
    INDEX idx_keyword (keyword_id)
);

-- 댓글
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(id) ON DELETE CASCADE,
    author VARCHAR(100),
    content TEXT NOT NULL,
    commented_at TIMESTAMP,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 감성 분석 결과
CREATE TABLE sentiment_analysis (
    id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(id) ON DELETE CASCADE,
    sentiment VARCHAR(20) NOT NULL, -- 'positive', 'negative', 'neutral'
    confidence FLOAT, -- 0.0 ~ 1.0
    keywords JSONB, -- ['강의', '좋음', '추천'] 형태
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 알림 로그
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    notification_type VARCHAR(50), -- 'negative_surge', 'daily_report'
    message TEXT,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 주요 기능 구현

### 1. 데이터 수집 (Crawler)

```python
# crawler/naver_cafe_crawler.py
from selenium import webdriver
from bs4 import BeautifulSoup
import time

class NaverCafeCrawler:
    def __init__(self, cafe_url, keyword):
        self.cafe_url = cafe_url
        self.keyword = keyword
        self.driver = webdriver.Chrome()  # or Playwright

    def search_posts(self):
        """키워드로 게시글 검색"""
        search_url = f"{self.cafe_url}/search?q={self.keyword}"
        self.driver.get(search_url)
        time.sleep(2)

        # 게시글 목록 파싱
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        posts = self._parse_posts(soup)
        return posts

    def _parse_posts(self, soup):
        """게시글 정보 추출"""
        posts = []
        # 실제 선택자는 사이트 구조에 따라 조정 필요
        for item in soup.select('.article-board tr'):
            post = {
                'title': item.select_one('.article-title').text,
                'url': item.select_one('a')['href'],
                'author': item.select_one('.p-nick').text,
                'posted_at': item.select_one('.td_date').text
            }
            posts.append(post)
        return posts
```

### 2. 감성 분석 (AI Analyzer)

```python
# analyzer/sentiment_analyzer.py
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

class SentimentAnalyzer:
    def __init__(self):
        # KoBERT 기반 감성 분석 모델 로드
        self.tokenizer = AutoTokenizer.from_pretrained("beomi/KcELECTRA-base-v2022")
        self.model = AutoModelForSequenceClassification.from_pretrained(
            "beomi/KcELECTRA-base-v2022"
        )

    def analyze(self, text):
        """텍스트 감성 분석"""
        inputs = self.tokenizer(text, return_tensors="pt",
                               truncation=True, max_length=512)

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=1)

        # 0: Negative, 1: Neutral, 2: Positive
        sentiment_id = torch.argmax(probabilities, dim=1).item()
        confidence = probabilities[0][sentiment_id].item()

        sentiment_map = {0: 'negative', 1: 'neutral', 2: 'positive'}

        return {
            'sentiment': sentiment_map[sentiment_id],
            'confidence': confidence
        }

    def extract_keywords(self, text, top_n=10):
        """주요 키워드 추출 (TF-IDF 기반)"""
        from sklearn.feature_extraction.text import TfidfVectorizer
        from konlpy.tag import Okt

        okt = Okt()
        tokens = okt.nouns(text)  # 명사만 추출

        # TF-IDF 벡터화
        vectorizer = TfidfVectorizer()
        # 실제로는 여러 문서에 대해 수행
        # 여기서는 단순화
        return tokens[:top_n]
```

### 3. Backend API (FastAPI)

```python
# api/main.py
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from typing import List
import datetime

app = FastAPI()

@app.get("/api/dashboard/summary")
async def get_dashboard_summary(
    user_id: int,
    date: datetime.date = None,
    db: Session = Depends(get_db)
):
    """일일 대시보드 요약 데이터"""
    if not date:
        date = datetime.date.today()

    # 오늘 수집된 게시글
    posts = db.query(Post).filter(
        Post.keyword_id.in_(
            db.query(Keyword.id).filter(Keyword.user_id == user_id)
        ),
        func.date(Post.posted_at) == date
    ).all()

    # 감성 분석 결과 집계
    sentiment_counts = db.query(
        SentimentAnalysis.sentiment,
        func.count(SentimentAnalysis.id)
    ).join(Post).filter(
        Post.id.in_([p.id for p in posts])
    ).group_by(SentimentAnalysis.sentiment).all()

    return {
        'date': date,
        'total_posts': len(posts),
        'sentiment_breakdown': dict(sentiment_counts),
        'posts': [serialize_post(p) for p in posts[:20]]  # 최근 20개
    }

@app.get("/api/trends")
async def get_trends(
    user_id: int,
    period: str = '7d',  # 7d, 30d
    db: Session = Depends(get_db)
):
    """트렌드 분석 데이터"""
    days = 7 if period == '7d' else 30
    start_date = datetime.date.today() - datetime.timedelta(days=days)

    # 날짜별 게시글 수 & 감성 비율
    daily_stats = db.query(
        func.date(Post.posted_at).label('date'),
        func.count(Post.id).label('count'),
        SentimentAnalysis.sentiment
    ).join(SentimentAnalysis).filter(
        Post.posted_at >= start_date
    ).group_by(
        func.date(Post.posted_at),
        SentimentAnalysis.sentiment
    ).all()

    return format_trend_data(daily_stats)
```

### 4. 스케줄러 (Celery Tasks)

```python
# tasks/crawler_tasks.py
from celery import Celery
from datetime import datetime

celery_app = Celery('academyinsight', broker='redis://localhost:6379/0')

@celery_app.task
def crawl_all_sources():
    """모든 소스에 대해 크롤링 실행"""
    sources = get_active_sources()  # DB에서 활성 소스 조회

    for source in sources:
        crawl_source.delay(source.id)

@celery_app.task
def crawl_source(source_id):
    """특정 소스 크롤링"""
    source = get_source_by_id(source_id)
    keywords = get_active_keywords()

    for keyword in keywords:
        crawler = get_crawler(source.source_type)
        posts = crawler.search_posts(source.url, keyword.keyword)

        # DB 저장
        for post_data in posts:
            save_post(post_data, source_id, keyword.id)

@celery_app.task
def analyze_new_posts():
    """분석되지 않은 게시글 감성 분석"""
    analyzer = SentimentAnalyzer()

    unanalyzed_posts = get_unanalyzed_posts()

    for post in unanalyzed_posts:
        full_text = f"{post.title} {post.content}"
        result = analyzer.analyze(full_text)
        keywords = analyzer.extract_keywords(full_text)

        save_sentiment_analysis(post.id, result, keywords)

# Celery Beat 스케줄 설정
celery_app.conf.beat_schedule = {
    'crawl-every-hour': {
        'task': 'tasks.crawler_tasks.crawl_all_sources',
        'schedule': 3600.0,  # 1시간마다
    },
    'analyze-every-30min': {
        'task': 'tasks.crawler_tasks.analyze_new_posts',
        'schedule': 1800.0,  # 30분마다
    },
}
```

## 개발 환경 설정

### 1. 프로젝트 구조
```
AcademyInsight/
├── backend/
│   ├── api/              # FastAPI 애플리케이션
│   ├── crawler/          # 크롤러 모듈
│   ├── analyzer/         # AI 분석 모듈
│   ├── models/           # DB 모델
│   ├── tasks/            # Celery 태스크
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── api/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

### 2. Docker Compose 설정

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: academyinsight
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    command: uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://admin:password@postgres:5432/academyinsight
      REDIS_URL: redis://redis:6379/0

  celery_worker:
    build: ./backend
    command: celery -A tasks.celery_app worker --loglevel=info
    volumes:
      - ./backend:/app
    depends_on:
      - redis
      - postgres

  celery_beat:
    build: ./backend
    command: celery -A tasks.celery_app beat --loglevel=info
    volumes:
      - ./backend:/app
    depends_on:
      - redis

  frontend:
    build: ./frontend
    command: npm run dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 3. 개발 시작하기

```bash
# 1. 저장소 클론
git clone <repository-url>
cd AcademyInsight

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일 편집 (DB 비밀번호, API 키 등)

# 3. Docker Compose로 모든 서비스 실행
docker-compose up -d

# 4. DB 마이그레이션
docker-compose exec backend alembic upgrade head

# 5. 초기 데이터 생성 (선택)
docker-compose exec backend python scripts/seed_data.py

# 접속:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

## 주요 고려사항

### 1. 크롤링 제약 및 대응
- **IP 차단**: Rotating Proxy, User-Agent 변경, 요청 간 지연(Rate Limiting)
- **로그인 필요**: Selenium으로 자동 로그인 처리
- **동적 콘텐츠**: Selenium/Playwright로 JavaScript 렌더링 대기
- **API 변경**: 정기적인 크롤러 점검 및 업데이트 필요

### 2. 법적 이슈
- **저작권**: 원문 전체 저장 대신 요약 정보만 수집
- **개인정보**: 작성자 ID는 해시 처리 또는 익명화
- **이용약관**: 각 사이트의 크롤링 정책 확인 필요

### 3. 성능 최적화
- **캐싱**: Redis로 자주 조회되는 데이터 캐시
- **비동기 처리**: FastAPI async/await, Celery 병렬 처리
- **DB 인덱싱**: posted_at, keyword_id 등 주요 컬럼 인덱스
- **페이지네이션**: 게시글 목록 무한 스크롤

### 4. 보안
- **API 인증**: JWT 토큰 기반 인증
- **SQL Injection**: ORM 사용으로 방지
- **XSS**: 프론트엔드 입력값 sanitize
- **환경 변수**: 민감 정보는 .env 파일로 관리 (git ignore)

## API 엔드포인트 예시

```
GET  /api/auth/login              # 로그인
POST /api/auth/register           # 회원가입

GET  /api/keywords                # 사용자 키워드 목록
POST /api/keywords                # 키워드 추가
PUT  /api/keywords/{id}           # 키워드 수정
DELETE /api/keywords/{id}         # 키워드 삭제

GET  /api/dashboard/summary       # 대시보드 요약
GET  /api/dashboard/trends        # 트렌드 분석
GET  /api/posts                   # 게시글 목록
GET  /api/posts/{id}              # 게시글 상세

GET  /api/notifications           # 알림 목록
POST /api/notifications/settings  # 알림 설정 변경
```

## 테스트

```bash
# Backend 유닛 테스트
docker-compose exec backend pytest tests/

# 크롤러 테스트
docker-compose exec backend pytest tests/test_crawler.py -v

# API 통합 테스트
docker-compose exec backend pytest tests/test_api.py -v
```

## 배포

### AWS 배포 예시
1. **EC2**: Backend, Celery Worker 실행
2. **RDS**: PostgreSQL 관리형 서비스
3. **ElastiCache**: Redis 관리형 서비스
4. **S3**: 정적 파일 저장
5. **CloudFront**: Frontend CDN
6. **Route53**: 도메인 관리

### CI/CD (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Docker images
        run: docker-compose build
      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login ...
          docker push ...
      - name: Deploy to EC2
        run: |
          ssh ec2-user@${{ secrets.EC2_HOST }} \
            "cd /app && docker-compose pull && docker-compose up -d"
```

## 향후 개선 방향
1. **AI 모델 고도화**: Fine-tuning으로 도메인 특화 감성 분석
2. **실시간 스트리밍**: WebSocket으로 실시간 알림
3. **경쟁사 비교**: 다른 강사와 비교 분석 기능
4. **모바일 앱**: React Native로 모바일 버전 개발
5. **다국어 지원**: i18n으로 영어권 확장

## 로컬 개발 테스트 환경

### 중요: 운영 Docker vs 로컬 테스트 분리

**서버 테스트 작업 시에는 운영 중인 Docker를 사용하지 않고, 로컬 서버를 이용해서 테스트를 진행해야 합니다.**

### 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `main` | 기본 브랜치 (개발/통합) |
| `prod` | 운영 배포 (push 시 GitHub Actions 자동 배포) |

### 환경 구분

| 환경 | 용도 | 포트 |
|------|------|------|
| **운영** | Docker Compose 배포 | Frontend: 4020, Backend: 8082 |
| **로컬** | 소스 직접 실행 | Frontend: 3000, Backend: 5000 |

### Docker Compose (운영)

```bash
# 서비스 기동
docker compose up -d

# 서비스 중지
docker compose down

# 로그 확인
docker logs academyinsight-backend
docker logs academyinsight-frontend
docker logs academyinsight-mongo
```

### 소스 코드 직접 실행 (Docker 없이)

```bash
# 의존성 설치
npm run install-all

# 서버 + 클라이언트 동시 실행
npm run dev
```

### 운영 배포

```bash
# main → prod 배포 (GitHub Actions 자동 트리거)
git push origin main:prod
```

### 주의사항

1. **운영 컨테이너 건드리지 않기**: `academyinsight-*` 컨테이너가 운영 중일 때 직접 조작하지 않기
2. **포트 충돌 확인**: 로컬 테스트 전 해당 포트(3000, 5000)가 사용 중이지 않은지 확인
3. **도메인**: 운영 도메인은 `insight.unmong.com`

## 문의 및 기여
- 이슈: GitHub Issues
- 기여: Pull Request 환영
