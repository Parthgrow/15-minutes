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
