import { NavUser } from "@/components/sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Bell } from "lucide-react";
import CreateNewChat from "../chat/CreateNewChat";
import NewGroupChatModal from "../chat/NewGroupChatModal";
import JoinGroupChatModal from "../chat/JoinGroupChatModal";
import GroupChatList from "../chat/GroupChatList";
import AddFriendModal from "../chat/AddFriendModal";
import DirectMessageList from "../chat/DirectMessageList";
import { useAuthStore } from "@/stores/useAuthStore";
import ConversationSkeleton from "../skeleton/ConversationSkeleton";
import { useChatStore } from "@/stores/useChatStore";
import FriendRequestDialog from "../friendRequest/FriendRequestDialog";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useEffect, useState } from "react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore();
  const { convoLoading } = useChatStore();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { fetchNotifications, unreadCount } = useNotificationStore();

  useEffect(() => {
    if (!user?._id) {
      return;
    }

    fetchNotifications();
  }, [user?._id]);

  return (
    <>
      <Sidebar
        variant="inset"
        {...props}
      >
        {/* Header */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="bg-gradient-primary"
              >
                <div className="flex w-full items-center justify-between px-2">
                  <h1 className="text-xl font-bold text-white">ChatApp</h1>

                  <button
                    type="button"
                    onClick={() => setNotificationOpen(true)}
                    className="relative inline-flex size-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 hover:text-white"
                    aria-label="Mở thông báo"
                  >
                    <Bell className="size-5" />
                    {unreadCount > 0 ? (
                      <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-fuchsia-500 ring-2 ring-white/80" />
                    ) : null}
                  </button>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Content */}
        <SidebarContent className="beautiful-scrollbar">
          {/* New Chat */}
          <SidebarGroup>
            <SidebarGroupContent>
              <CreateNewChat />
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Group Chat */}
          <SidebarGroup>
            <div className="flex items-center justify-between">
              <SidebarGroupLabel className="uppercase">nhóm chat</SidebarGroupLabel>
              <div className="flex items-center gap-2">
                <JoinGroupChatModal />
                <NewGroupChatModal />
              </div>
            </div>

            <SidebarGroupContent>
              {convoLoading ? <ConversationSkeleton /> : <GroupChatList />}
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Dirrect Message */}
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase">bạn bè</SidebarGroupLabel>
            <SidebarGroupAction
              title="Kết Bạn"
              className="cursor-pointer"
            >
              <AddFriendModal />
            </SidebarGroupAction>

            <SidebarGroupContent>
              {convoLoading ? <ConversationSkeleton /> : <DirectMessageList />}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
      </Sidebar>

      <FriendRequestDialog
        open={notificationOpen}
        setOpen={setNotificationOpen}
      />
    </>
  );
}
