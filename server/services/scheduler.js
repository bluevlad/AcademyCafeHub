const cron = require('node-cron');
const CrawlerManager = require('./CrawlerManager');

class CrawlScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
    this.lastRun = null;
    this.lastResult = null;
    this.lastError = null;
  }

  start() {
    const enabled = process.env.CRAWL_ENABLED !== 'false';
    if (!enabled) {
      console.log('[Scheduler] 크롤링 스케줄러 비활성화 (CRAWL_ENABLED=false)');
      return;
    }

    const schedule = process.env.CRAWL_SCHEDULE || '0 4 * * *';

    if (!cron.validate(schedule)) {
      console.error(`[Scheduler] 잘못된 cron 표현식: ${schedule}`);
      return;
    }

    this.task = cron.schedule(schedule, () => {
      this.executeCrawl();
    }, {
      timezone: 'Asia/Seoul'
    });

    console.log(`[Scheduler] 크롤링 스케줄 등록: ${schedule} (KST)`);
  }

  async executeCrawl() {
    if (this.isRunning) {
      console.log('[Scheduler] 이전 크롤링이 아직 실행 중 - 건너뜀');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    console.log(`[Scheduler] 일일 크롤링 시작: ${new Date().toISOString()}`);

    try {
      const result = await CrawlerManager.crawlAll();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      this.lastRun = new Date();
      this.lastResult = result;
      this.lastError = null;

      console.log(`[Scheduler] 크롤링 완료 (${elapsed}초)`);
      console.log(`[Scheduler] 학원: ${result.totalAcademies}개 처리`);

      for (const r of result.results) {
        if (r.error) {
          console.log(`[Scheduler]   ${r.academy}: 오류 - ${r.error}`);
        } else {
          console.log(`[Scheduler]   ${r.academy}: ${r.totalPostsSaved}개 저장, ${r.completed}/${r.totalJobs} 완료`);
        }
      }
    } catch (error) {
      this.lastError = error.message;
      console.error('[Scheduler] 크롤링 실패:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  stop() {
    if (this.task) {
      this.task.stop();
      console.log('[Scheduler] 스케줄러 중지');
    }
  }

  getStatus() {
    return {
      enabled: process.env.CRAWL_ENABLED !== 'false',
      schedule: process.env.CRAWL_SCHEDULE || '0 4 * * *',
      timezone: 'Asia/Seoul',
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      lastResult: this.lastResult,
      lastError: this.lastError
    };
  }
}

module.exports = new CrawlScheduler();
