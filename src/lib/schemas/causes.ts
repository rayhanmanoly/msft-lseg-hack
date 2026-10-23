import { z } from 'zod';

/**
 * Canonical cause taxonomy. User free-text causes are mapped onto these ids
 * (embedding similarity on `description`, then LLM confirmation if ambiguous).
 * The ethics cache is keyed by these ids. Additive changes only after freeze.
 */
export const CAUSES = [
  { id: 'climate_emissions', label: 'Climate & emissions', description: 'Greenhouse gas emissions, fossil fuel dependence, climate targets, greenwashing.' },
  { id: 'biodiversity', label: 'Biodiversity & land use', description: 'Deforestation, habitat destruction, water use, pollution of ecosystems.' },
  { id: 'fair_wages', label: 'Fair wages', description: 'Living wage, pay equity, wage theft, gender or ethnicity pay gaps.' },
  { id: 'labour_rights', label: 'Labour rights & safety', description: 'Unionisation, working conditions, workplace safety, worker exploitation.' },
  { id: 'supply_chain', label: 'Supply chain ethics', description: 'Forced or child labour, conflict minerals, supplier abuses, sourcing transparency.' },
  { id: 'animal_welfare', label: 'Animal welfare', description: 'Animal testing, factory farming, animal cruelty in operations or supply chain.' },
  { id: 'human_rights', label: 'Human rights', description: 'Operations in conflict zones, complicity in abuses, indigenous rights, censorship.' },
  { id: 'data_privacy', label: 'Data privacy & security', description: 'Data breaches, surveillance, misuse of customer data, weak cybersecurity.' },
  { id: 'diversity_inclusion', label: 'Diversity & inclusion', description: 'Board and workforce diversity, discrimination, harassment.' },
  { id: 'anti_corruption', label: 'Anti-corruption & governance', description: 'Bribery, fraud, accounting scandals, sanctions breaches, board independence.' },
  { id: 'tax_transparency', label: 'Tax transparency', description: 'Aggressive tax avoidance, offshore structures, lack of tax disclosure.' },
  { id: 'product_safety', label: 'Product safety & health', description: 'Unsafe products, recalls, misleading marketing, public health harm.' },
  { id: 'community_impact', label: 'Community impact', description: 'Local community harm or investment, displacement, social license to operate.' },
  { id: 'customer_practices', label: 'Customer practices', description: 'Mis-selling, unfair fees, misleading marketing, poor treatment of customers, complaints and redress.' },
  { id: 'executive_pay', label: 'Executive pay', description: 'Excessive executive remuneration relative to performance or workforce pay.' },
] as const;

export const causeIdSchema = z.enum(CAUSES.map((c) => c.id) as [CauseId, ...CauseId[]]);
export type CauseId = (typeof CAUSES)[number]['id'];

export const causeById = (id: CauseId) => CAUSES.find((c) => c.id === id)!;
