import { z } from 'zod';
import { InstagramClient } from '../instagram/client.js';
import { formatErrorForMcp } from '../utils/errors.js';

export const accountOverviewSchema = {
  username: z.string().optional().describe(
    'Instagram username to look up. Leave empty to get your own account info.'
  ),
};

export const accountOverviewDescription =
  'Get Instagram account profile information including follower/following counts, bio, and account details.';

export async function getAccountOverview(
  client: InstagramClient,
  params: { username?: string }
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const overview = await client.getAccountOverview(params.username);

    const result = {
      userId: overview.userId,
      username: overview.username,
      fullName: overview.fullName,
      bio: overview.bio,
      profilePicUrl: overview.profilePicUrl,
      statistics: {
        followers: overview.followerCount,
        following: overview.followingCount,
        posts: overview.mediaCount,
      },
      accountType: {
        isPrivate: overview.isPrivate,
        isVerified: overview.isVerified,
        isBusiness: overview.isBusiness,
      },
      externalUrl: overview.externalUrl,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: formatErrorForMcp(error),
        },
      ],
    };
  }
}
