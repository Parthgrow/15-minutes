import { dbHelpers } from '../db';
import { CommandResult } from '../types';
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

  const existing = await dbHelpers.getFeatureByName(
    context.currentProjectId,
    featureName
  );
  if (existing) {
    return {
      success: false,
      message: `Feature "${featureName}" already exists in this project`,
    };
  }

  const feature = await dbHelpers.createFeature(
    context.currentProjectId,
    featureName
  );
  const features = await dbHelpers.getFeatures(context.currentProjectId);
  const featureNumber = features.length;

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

  const features = await dbHelpers.getFeatures(context.currentProjectId);
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
