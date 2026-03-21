import type { Migration } from "../migrationRunner.js";

/**
 * 007: 정책 엔진(PolicyEngine) 관련 테이블 제거 (v6.2)
 *
 * v5.0에서 도입된 policy_rules, approval_history 테이블이
 * 런타임에서 한 번도 evaluate()되지 않는 죽은 코드로 확인되어 제거.
 * 인덱스는 테이블 DROP 시 자동 삭제된다.
 */
export const migration007: Migration = {
  version: 7,
  name: "remove_policy",
  up(db) {
    db.exec(`
      DROP TABLE IF EXISTS approval_history;
      DROP TABLE IF EXISTS policy_rules;
    `);
  },
};
