import type { Migration } from "../migrationRunner.js";
import { migration001 } from "./001_baseline.js";
import { migration002 } from "./002_v5_schedule.js";
import { migration003 } from "./003_v5_policy.js";
import { migration004 } from "./004_v5_knowledge_links.js";
import { migration005 } from "./005_consolidate_adhoc_columns.js";
import { migration006 } from "./006_remove_domain_pack.js";
import { migration007 } from "./007_remove_policy.js";
import { migration008 } from "./008_email_inbox.js";
import { migration009 } from "./009_code_analysis.js";
import { migration010 } from "./010_email_provider.js";
import { migration011 } from "./011_add_missing_indexes.js";
import { migration012 } from "./012_vector_embeddings.js";
import { migration013 } from "./013_reports.js";
import { migration014 } from "./014_search_config.js";
import { migration015 } from "./015_embedding_enhancements.js";
import { migration016 } from "./016_report_schedules.js";
import { migration017 } from "./017_data_platform.js";

/** 모든 마이그레이션을 버전 순서로 내보낸다. */
export const allMigrations: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
  migration009,
  migration010,
  migration011,
  migration012,
  migration013,
  migration014,
  migration015,
  migration016,
  migration017,
];
