import type { DomainPack } from "../../types/domain.js";
import { SAP_LABEL_DEFINITIONS } from "./labels.js";
import { SAP_PRESET_SKILLS, SAP_SKILL_PACKS } from "./skills.js";
import { SAP_ROUTINE_TEMPLATES } from "./routines.js";

export const sapDomainPack: DomainPack = {
  id: "sap",
  name: "SAP ERP",
  description: "SAP ERP 운영 및 CBO 유지보수를 위한 도메인 팩",
  labelDefinitions: SAP_LABEL_DEFINITIONS,
  presetSkills: SAP_PRESET_SKILLS,
  skillPacks: SAP_SKILL_PACKS,
  routineTemplates: SAP_ROUTINE_TEMPLATES,
  codeAnalyzerEnabled: true,
};
