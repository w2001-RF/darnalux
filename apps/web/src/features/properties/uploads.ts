import { buildStoragePath } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';
import { newId, removeFromBucket, uploadToBucket } from '../../lib/files';

export async function uploadImage(propertyId: string, file: File, position: number): Promise<void> {
  const path = buildStoragePath([propertyId], file.name, newId());
  await uploadToBucket('property-images', path, file);
  try {
    unwrap(await supabase.from('property_images').insert({ property_id: propertyId, storage_path: path, position }));
  } catch (error) {
    await removeFromBucket('property-images', [path]).catch(() => undefined);
    throw error;
  }
}
