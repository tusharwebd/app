import React from "react";
import { useRouter } from "next/router";

import Footer from "components/organisms/Footer/footer";
import Header from "components/organisms/Header/header";
import Nav from "components/organisms/ToolList/nav";
import TopNav from "components/organisms/TopNav/top-nav";
import InsightHeader from "components/molecules/InsightHeader/insight-header";

import useNav from "lib/hooks/useNav";
import useInsight from "lib/hooks/useInsight";
import useSupabaseAuth from "lib/hooks/useSupabaseAuth";
import SkeletonWrapper from "components/atoms/SkeletonLoader/skeleton-wrapper";
import ClientOnly from "components/atoms/ClientOnly/client-only";
const HubPageLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { userId } = useSupabaseAuth();
  const { pageId, range } = router.query;
  const insightId = pageId as string;
  const { data: insight, isLoading, isError } = useInsight(insightId);
  const repositories = insight?.repos.map((repo) => repo.repo_id);

  const { toolList, selectedTool, selectedFilter, userOrg } = useNav(repositories);

  const membership = insight?.members?.find((member) => member.user_id === Number(userId));
  const canEdit = membership && ["edit", "admin"].includes(membership.access);

  return (
    <div className="flex flex-col min-h-screen">
      <TopNav />
      <div className="flex flex-col items-center pt-20 page-container grow md:pt-14">
        <div className="info-container container w-full min-h-[100px]">
          <Header>
            <ClientOnly>
              {isLoading ? (
                <div className="flex justify-between w-full h-46">
                  <div className="flex items-center gap-3">
                    <SkeletonWrapper radius={10} width={140} height={140} />
                    <div className="flex flex-col gap-3">
                      <SkeletonWrapper width={110} height={25} />
                      <SkeletonWrapper width={200} height={25} />
                      <SkeletonWrapper classNames="mt-3" width={150} height={30} />
                    </div>
                  </div>
                  <div>
                    <SkeletonWrapper classNames="mt-6" width={150} height={40} />
                  </div>
                </div>
              ) : null}
            </ClientOnly>

            {isError ? <div>Error occurred</div> : null}

            {insight && (
              <ClientOnly>
                <InsightHeader insight={insight} repositories={repositories} insightId={insightId} canEdit={canEdit} />
              </ClientOnly>
            )}
          </Header>

          <Nav
            toolList={toolList}
            selectedTool={selectedTool && selectedTool.toString()}
            filterName={pageId}
            selectedFilter={selectedFilter}
            username={userOrg}
          />
        </div>

        <main className="flex flex-col items-center flex-1 w-full px-3 py-8 md:px-16 bg-light-slate-2">
          <div className="container px-2 mx-auto md:px-16">{children}</div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default HubPageLayout;
