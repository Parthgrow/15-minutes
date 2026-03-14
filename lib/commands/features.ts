import { CommandResult, Feature } from '../types';
import { CommandContext } from './types';

// new feature [name] - Create a new feature
export async function newFeature(
  args: string[],
  context?: CommandContext
): Promise<CommandResult> {
  if (!context?.currentProjectId) {
    return {
      success: false,
      message: 'No active project. Create or switch to a project first.',
    };
  }

  const featureName = args.join(' ');
  if (!featureName) {
    return {
      success: false,
      message: 'Feature name is required',
    };
  }

  // Check if feature already exists
  // const featuresRes = await fetch(
  //   `/api/features?projectId=${context.currentProjectId}`
  // );
  // const features: Feature[] = await featuresRes.json();
  // const existing = features.find(
  //   (f) => f.name.toLowerCase() === featureName.toLowerCase()
  // );

  // if (existing) {
  //   return {
  //     success: false,
  //     message: `Feature "${featureName}" already exists in this project`,
  //   };
  // }

  // Create new feature
  const createRes = await fetch('/api/features', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: context.currentProjectId, name: featureName }),
  });
  const feature = await createRes.json();

  // Get updated feature count for numbering
  const updatedFeaturesRes = await fetch(
    `/api/features?projectId=${context.currentProjectId}`
  );
  const updatedFeatures: Feature[] = await updatedFeaturesRes.json();
  const featureNumber = updatedFeatures.length;

  return {
    success: true,
    message: `Created feature #${featureNumber}: ${featureName}`,
    data: { feature },
  };
}

// delete feature [id] - Delete a feature by list index and cascade delete its tasks
export async function deleteFeature(
  args: string[],
  context?: CommandContext
): Promise<CommandResult> {
  if (!context?.currentProjectId) {
    return {
      success: false,
      message: 'No active project. Switch to a project first.',
    };
  }

  const featureIdNum = parseInt(args[0]);
  if (isNaN(featureIdNum) || featureIdNum < 1) {
    return {
      success: false,
      message: 'Usage: delete feature [id]\nExample: delete feature 2',
    };
  }

  const featuresRes = await fetch(
    `/api/features?projectId=${context.currentProjectId}`
  );
  const features: Feature[] = await featuresRes.json();
  const feature = features[featureIdNum - 1];

  if (!feature) {
    return {
      success: false,
      message: `Feature #${featureIdNum} not found. Use 'features' to see available features.`,
    };
  }

  const res = await fetch(`/api/features/${feature.id}`, { method: 'DELETE' });

  if (!res.ok) {
    const err = await res.json();
    return { success: false, message: err.error ?? 'Failed to delete feature' };
  }

  return {
    success: true,
    message: `Feature "${feature.name}" deleted.`,
    data: { refresh: true },
  };
}

// features - List all features in current project
export async function listFeatures(
  args: string[],
  context?: CommandContext
): Promise<CommandResult> {
  if (!context?.currentProjectId) {
    return {
      success: false,
      message: 'No active project. Create or switch to a project first.',
    };
  }

  const featuresRes = await fetch(
    `/api/features?projectId=${context.currentProjectId}`
  );
  const features: Feature[] = await featuresRes.json();

  if (features.length === 0) {
    return {
      success: true,
      message: 'No features yet. Create one with: new feature [name]',
    };
  }

  const featureList = features
    .map((f, i) => `[${i + 1}] ${f.name}`)
    .join('\n');

  return {
    success: true,
    message: `Your features:\n${featureList}`,
    data: { features },
  };
}
