import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';

export interface ContractTemplateRow {
  id: string;
  name: string;
  kind: 'DEFAULT' | 'CUSTOM';
  body: string;
  is_active: boolean;
  is_locked: boolean;
  updated_at: string;
}

export async function listContractTemplates(): Promise<ContractTemplateRow[]> {
  return (
    unwrap(
      await supabase
        .from('contract_templates')
        .select('id, name, kind, body, is_active, is_locked, updated_at')
        .order('kind')
        .order('created_at')
        .returns<ContractTemplateRow[]>(),
    ) ?? []
  );
}

export async function createContractTemplate(name: string, body: string): Promise<string> {
  return unwrap(
    await supabase.from('contract_templates').insert({ name: name.trim(), body, kind: 'CUSTOM' }).select('id').single<{ id: string }>(),
  ).id;
}

export async function updateContractTemplate(id: string, name: string, body: string): Promise<void> {
  unwrap(await supabase.from('contract_templates').update({ name: name.trim(), body }).eq('id', id));
}

export async function deleteContractTemplate(id: string): Promise<void> {
  unwrap(await supabase.from('contract_templates').delete().eq('id', id));
}

export async function activateContractTemplate(id: string): Promise<void> {
  unwrap(await supabase.rpc('activate_contract_template', { p_template_id: id }));
}
