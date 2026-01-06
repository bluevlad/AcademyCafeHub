/**
 * 네이버 카페 크롤러 테스트 스크립트
 *
 * 사용법:
 * node test-crawler.js
 */

const NaverCafeCrawler = require('./server/services/naverCafeCrawler');

async function testCrawler() {
  const crawler = new NaverCafeCrawler('https://cafe.naver.com/m2school');

  try {
    console.log('='.repeat(60));
    console.log('네이버 카페 크롤러 테스트 시작');
    console.log('='.repeat(60));
    console.log('');

    // 테스트 1: "윌비스" 키워드로 검색
    console.log('📝 테스트 1: "윌비스" 키워드 검색 (최대 10개)');
    console.log('-'.repeat(60));

    const posts = await crawler.searchPosts('윌비스', 10);

    console.log(`✅ 총 ${posts.length}개의 게시글을 찾았습니다.\n`);

    if (posts.length > 0) {
      console.log('📋 검색 결과:\n');
      posts.forEach((post, index) => {
        console.log(`[${index + 1}] ${post.title}`);
        console.log(`    작성자: ${post.author}`);
        console.log(`    URL: ${post.url}`);
        console.log(`    작성일: ${post.postedAt}`);
        console.log(`    조회수: ${post.viewCount} | 댓글: ${post.commentCount}`);
        console.log('');
      });

      // 테스트 2: 첫 번째 게시글 상세 정보 가져오기 (URL이 있는 경우)
      if (posts[0].url) {
        console.log('='.repeat(60));
        console.log('📝 테스트 2: 첫 번째 게시글 상세 정보 가져오기');
        console.log('-'.repeat(60));
        console.log('');

        try {
          const detail = await crawler.getPostDetail(posts[0].url);
          console.log(`제목: ${detail.title}`);
          console.log(`작성자: ${detail.author}`);
          console.log(`작성일: ${detail.postedAt}`);
          console.log(`조회수: ${detail.viewCount}`);
          console.log(`댓글 수: ${detail.comments.length}`);
          console.log('');

          if (detail.comments.length > 0) {
            console.log('💬 댓글 미리보기 (최대 3개):');
            detail.comments.slice(0, 3).forEach((comment, idx) => {
              console.log(`  [${idx + 1}] ${comment.author}: ${comment.content.substring(0, 50)}...`);
            });
          }
        } catch (error) {
          console.log(`⚠️  게시글 상세 정보 가져오기 실패: ${error.message}`);
        }
      }
    } else {
      console.log('⚠️  검색 결과가 없습니다.');
      console.log('💡 참고: 네이버 카페 구조 변경이나 접근 제한이 있을 수 있습니다.');
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ 테스트 완료');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
    console.error(error.stack);
  } finally {
    await crawler.close();
    console.log('\n🔒 브라우저 종료됨');
  }
}

// 테스트 실행
testCrawler();
