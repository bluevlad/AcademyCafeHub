@echo off
echo ====================================
echo   윌비스 크롤러 백엔드 서버 시작
echo ====================================
echo.
echo [1/2] 환경 설정 확인 중...

if not exist .env (
    echo [!] .env 파일이 없습니다. .env.example을 복사합니다...
    copy .env.example .env
    echo [OK] .env 파일 생성 완료
)

echo [2/2] 서버 시작 중...
echo.
echo ====================================
echo   서버가 http://localhost:5000 에서 실행됩니다
echo   종료하려면 Ctrl+C를 누르세요
echo ====================================
echo.

npm run server
