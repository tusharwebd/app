import { useState } from "react";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MinusSmallIcon,
} from "@heroicons/react/24/solid";
import clsx from "clsx";

import { RepositoriesRows } from "components/organisms/RepositoriesTable/repositories-table";
import Pill from "components/atoms/Pill/pill";
import Sparkline from "components/atoms/Sparkline/sparkline";
import { classNames } from "components/organisms/RepositoriesTable/repositories-table";
import Checkbox from "components/atoms/Checkbox/checkbox";

import { getRelativeDays } from "lib/utils/date-utils";
import useSupabaseAuth from "lib/hooks/useSupabaseAuth";
import getPercent from "lib/utils/get-percent";
import { getAvatarByUsername } from "lib/utils/github";
import useRepositoryPullRequests from "lib/hooks/api/useRepositoryPullRequests";
import { getPullRequestsHistogramToDays } from "lib/utils/get-prs-to-days";
import getPullRequestsContributors from "lib/utils/get-pr-contributors";
import useStore from "lib/store";
import { usePullRequestsHistogram } from "lib/hooks/api/usePullRequestsHistogram";
import TableRepositoryName from "../TableRepositoryName/table-repository-name";
import PullRequestOverview from "../PullRequestOverview/pull-request-overview";
import StackedAvatar from "../StackedAvatar/stacked-avatar";

interface RepoProps {
  repo: RepositoriesRows;
  topic?: string;
  userPage: string | string[] | undefined;
  selected?: boolean;
  handleOnSelectRepo: (repo: RepositoriesRows) => void;
}

export const getActivity = (total?: number, loading?: boolean) => {
  if (total === undefined || loading) {
    return "-";
  }

  if (total > 80) {
    return <Pill icon={<ArrowTrendingUpIcon color="green" className="w-4 h-4" />} text="High" color="green" />;
  }

  if (total >= 5 && total <= 80) {
    return <Pill icon={<MinusSmallIcon color="black" className="w-4 h-4" />} text="Medium" color="yellow" />;
  }

  return <Pill icon={<ArrowTrendingDownIcon color="red" className="w-4 h-4" />} text="Low" color="red" />;
};

const getTotalPrs = (
  openPrsCount?: number,
  mergedPrsCount?: number,
  closedPrsCount?: number,
  draftPrsCount?: number
): number => {
  const open = openPrsCount || 0;
  const merged = mergedPrsCount || 0;
  const closed = closedPrsCount || 0;
  const drafts = draftPrsCount || 0;

  const total = open + closed + merged - drafts;

  if (total <= 0) {
    return 0;
  }

  return total;
};

const getPrsSpam = (total: number, spam: number): number => {
  if (total <= 0) {
    return 0;
  }

  const result = Math.floor((spam / total) * 100);

  return result;
};

const RepoRow = ({ repo, topic, userPage, selected, handleOnSelectRepo }: RepoProps): JSX.Element => {
  const {
    full_name: fullName,
    open_prs_count: openPrsCount,
    closed_prs_count: closedPrsCount,
    draft_prs_count: draftPrsCount,
    merged_prs_count: mergedPrsCount,
    spam_prs_count: spamPrsCount,
    pr_velocity_count: prVelocityCount,
  } = repo;
  const ownerAvatar = getAvatarByUsername(fullName.split("/")[0]);

  const { user } = useSupabaseAuth();
  const range = useStore((state) => state.range);
  const { data: repositoryPullRequests } = useRepositoryPullRequests(repo.full_name, 100, range);
  const { data: repositoryPullRequestsHistogram } = usePullRequestsHistogram({
    repoIds: [repo.id as unknown as number],
    width: 1,
    range: Number(range || "30"),
  });
  const totalPrs = getTotalPrs(openPrsCount, mergedPrsCount, closedPrsCount, draftPrsCount);
  const prsMergedPercentage = getPercent(totalPrs, mergedPrsCount || 0);
  const spamPrsPercentage = getPrsSpam(totalPrs, spamPrsCount || 0);
  const prVelocityInDays = getRelativeDays(prVelocityCount || 0);
  const contributorData = getPullRequestsContributors(repositoryPullRequests);

  const days = getPullRequestsHistogramToDays(repositoryPullRequestsHistogram, Number(range || "30"));

  const last30days = [
    {
      id: `last30-${repo.id}`,
      color: "hsl(63, 70%, 50%)",
      data: days,
    },
  ];

  const [tableOpen, setTableOpen] = useState<boolean>(false);

  const handleSelectCheckbox = () => {
    handleOnSelectRepo(repo);
  };

  return (
    <>
      <div
        key={`${ownerAvatar}/${name}`}
        className="px-5 py-2 overflow-hidden odd:bg-white md:hidden even:bg-light-slate-2"
      >
        {/* Row: Repository Name and Pr overview */}
        <div className="flex items-center gap-x-3">
          <Checkbox
            checked={selected ? true : false}
            onCheckedChange={handleSelectCheckbox}
            className={`${user && "border-orange-500 hover:bg-orange-600"}`}
          />
          <div className="w-[55%]">
            <TableRepositoryName topic={topic} avatarURL={ownerAvatar} fullName={fullName as string} user={userPage} />
          </div>
          <div className="w-[45%]">
            {repo.id ? (
              <PullRequestOverview
                open={openPrsCount}
                merged={mergedPrsCount}
                closed={closedPrsCount}
                draft={draftPrsCount}
              />
            ) : (
              "-"
            )}
          </div>
          <div>
            <div
              onClick={() => setTableOpen(!tableOpen)}
              className="items-center justify-between w-6 h-6 p-1 border rounded-md"
            >
              {tableOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </div>
          </div>
        </div>

        <div className={`${!tableOpen && "max-h-0"}   text-light-slate-11 text-sm transition`}>
          {/* Column: Last 30 Days */}
          <div className="py-3">{last30days && <Sparkline data={last30days} width="100%" height={54} />}</div>
          {/* Row: Activity */}
          <div className="flex items-center justify-between py-3 border-b">
            <div>Activity</div>
            {getActivity(totalPrs, false)}
          </div>

          {/* Row: Pr velocity */}
          <div className="flex items-center justify-between py-3 border-b">
            <div>Pr Velocity</div>
            <div className="flex text-base gap-x-3">
              <div>{prVelocityInDays}</div>
              {repo.id ? <Pill color="purple" text={`${prsMergedPercentage}%`} /> : ""}
            </div>
          </div>

          {/* Row: SPAM */}
          <div className="flex items-center justify-between py-3 border-b">
            <div>Spam</div>
            <div className="flex text-base gap-x-3">
              {spamPrsCount && spamPrsCount > 0 ? (
                <>
                  <div>
                    {spamPrsCount || 0} PR{spamPrsCount === 1 ? "" : "s"}
                  </div>
                  <Pill
                    text={`${spamPrsPercentage || 0}%`}
                    size="small"
                    color={spamPrsPercentage > 10 ? "red" : "yellow"}
                  />
                </>
              ) : (
                "-"
              )}
            </div>
          </div>

          {/* Row: Contributors */}

          <div className="flex items-center justify-between py-3">
            <div>Contributors</div>
            <div className="flex items-center text-base">
              {contributorData.length! > 0 ? <StackedAvatar contributors={contributorData} /> : "-"}
              {contributorData.length! >= 5 ? <div>&nbsp;{`+${contributorData.length - 5}`}</div> : ""}
            </div>
          </div>

          <div onClick={() => setTableOpen(!tableOpen)} className="py-1 mt-3 text-center border rounded-lg">
            Hide details
          </div>
        </div>
      </div>
      <div className={`${classNames.row} `}>
        <Checkbox
          checked={selected ? true : false}
          onCheckedChange={handleSelectCheckbox}
          className={`${user && "border-orange-500 hover:bg-orange-600"}`}
        />
        {/* Column: Repository Name */}
        <div className={classNames.cols.repository}>
          <TableRepositoryName
            topic={topic}
            avatarURL={ownerAvatar}
            fullName={fullName as string}
            user={userPage}
          ></TableRepositoryName>
        </div>

        {/* Column: Activity */}
        <div className={classNames.cols.activity}>{getActivity(totalPrs, false)}</div>

        {/* Column: PR Overview */}
        <div className={classNames.cols.prOverview}>
          {repo.id ? (
            <PullRequestOverview
              open={openPrsCount}
              merged={mergedPrsCount}
              closed={closedPrsCount}
              draft={draftPrsCount}
            ></PullRequestOverview>
          ) : (
            "-"
          )}
        </div>

        {/* Column: PR Velocity */}
        <div className={`${classNames.cols.prVelocity}`}>
          <div>{prVelocityInDays}</div>
          {repo.id ? <Pill color="purple" text={`${prsMergedPercentage}%`} /> : ""}
        </div>

        {/* Column: SPAM */}
        <div className={`${classNames.cols.spam}`}>
          {spamPrsCount && spamPrsCount > 0 ? (
            <>
              <div>
                {spamPrsCount || 0} PR{spamPrsCount === 1 ? "" : "s"}
              </div>
              <Pill
                text={`${spamPrsPercentage || 0}%`}
                size="small"
                color={spamPrsPercentage > 10 ? "red" : "yellow"}
              />
            </>
          ) : (
            "-"
          )}
        </div>

        {/* Column: Contributors */}
        <div className={clsx(classNames.cols.contributors, "hidden xl:flex")}>
          {contributorData.length! > 0 ? <StackedAvatar contributors={contributorData} /> : "-"}

          {contributorData.length! > 5 ? <div>&nbsp;{`+${contributorData.length - 5}`}</div> : ""}
        </div>

        {/* Column: Last 30 Days */}
        <div className={clsx(classNames.cols.last30days, "hidden xl:flex")}>
          {repo.id && last30days ? <Sparkline data={last30days} /> : "-"}
        </div>
      </div>
    </>
  );
};
export default RepoRow;
