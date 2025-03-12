import * as core from '@actions/core'

function getVideoByBvid(bvid: string): Promise<any> {
  return fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`).then(res => res.json())
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const bvid: string = core.getInput('bvid')
    await getVideoByBvid(bvid)

  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
