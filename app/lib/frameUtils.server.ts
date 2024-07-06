import { DEFAULT_HUB_API_KEY, DEFAULT_HUB_API_URL } from "./constants";
import { getAddressesForFid, getUserDataForFid } from "frames.js";

const hubHttpUrl = DEFAULT_HUB_API_URL;
const hubRequestOptions = {
  headers: {
    api_key: DEFAULT_HUB_API_KEY,
  },
};

export function bytesToHexString(bytes: Uint8Array): `0x${string}` {
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

export function normalizeCastId(castId: { fid: string; hash: Uint8Array }): {
  fid: string;
  hash: `0x${string}`;
} {
  return {
    fid: castId.fid,
    hash: bytesToHexString(castId.hash),
  };
}

export async function fetchHubContext(
  requesterFid: number,
  castId: {
    fid: number;
    hash: Uint8Array;
  }
) {

  const [
    requesterFollowsCaster,
    casterFollowsRequester,
    likedCast,
    recastedCast,
    requesterEthAddresses,
    requesterUserData,
  ] = await Promise.all([
    fetch(
      `${hubHttpUrl}/v1/linkById?fid=${requesterFid}&target_fid=${castId?.fid}&link_type=follow`,
      hubRequestOptions
    ).then((res) => res.ok || requesterFid === castId?.fid),
    fetch(
      `${hubHttpUrl}/v1/linkById?fid=${castId?.fid}&target_fid=${requesterFid}&link_type=follow`,
      hubRequestOptions
    ).then((res) => res.ok || requesterFid === castId?.fid),
    fetch(
      `${hubHttpUrl}/v1/reactionById?fid=${requesterFid}&reaction_type=1&target_fid=${castId?.fid}&target_hash=${castId?.hash}`,
      hubRequestOptions
    ).then((res) => res.ok),
    fetch(
      `${hubHttpUrl}/v1/reactionById?fid=${requesterFid}&reaction_type=2&target_fid=${castId?.fid}&target_hash=${castId?.hash}`,
      hubRequestOptions
    ).then((res) => res.ok),
    getAddressesForFid({
      fid: requesterFid,
      options: {
        hubHttpUrl,
        hubRequestOptions,
      },
    }),
    getUserDataForFid({
      fid: requesterFid,
      options: {
        hubHttpUrl,
        hubRequestOptions,
      },
    }),
  ]);

  const requesterCustodyAddress = requesterEthAddresses.find(
    (item) => item.type === "custody"
  )?.address;

  //   if (!requesterCustodyAddress) {
  //     throw new Error("Custody address not found");
  //   }

  const requesterVerifiedAddresses = requesterEthAddresses
    .filter((item) => item.type === "verified")
    .map((item) => item.address);

  // Perform actions to fetch the HubFrameContext and then return the combined result
  const hubContext = {
    casterFollowsRequester,
    requesterFollowsCaster,
    likedCast,
    recastedCast,
    requesterVerifiedAddresses,
    requesterCustodyAddress,
    requesterUserData,
  };

  return hubContext;
}
