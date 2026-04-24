import pc from 'picocolors';
import { loadCV, ValidationError, YAMLParseError } from '@cvmake/core';

export async function runValidate(yamlPath: string): Promise<number> {
  try {
    await loadCV(yamlPath);
    console.warn(pc.green(`✓ ${yamlPath} valid`));
    return 0;
  } catch (err) {
    if (err instanceof YAMLParseError) {
      console.error(
        pc.red(`✗ ${err.path} YAML parse error @ line ${err.line ?? '?'}: ${err.message}`),
      );
    } else if (err instanceof ValidationError) {
      console.error(pc.red(`✗ ${err.path}`));
      for (const issue of err.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
    } else {
      console.error(pc.red(String(err)));
    }
    return 1;
  }
}
