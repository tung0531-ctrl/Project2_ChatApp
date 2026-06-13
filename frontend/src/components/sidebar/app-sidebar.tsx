import { NavUser } from "@/components/sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Bell } from "lucide-react";
import { Search } from "lucide-react";
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
import { useFriendStore } from "@/stores/useFriendStore";
import { Input } from "../ui/input";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore();
  const { convoLoading } = useChatStore();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [friendSearchOpen, setFriendSearchOpen] = useState(false);
  const [friendKeyword, setFriendKeyword] = useState("");
  const { fetchNotifications, unreadCount } = useNotificationStore();
  const { getFriends } = useFriendStore();

  useEffect(() => {
    if (!user?._id) {
      return;
    }

    fetchNotifications();
    getFriends();
  }, [user?._id]);

  useEffect(() => {
    if (friendSearchOpen) {
      return;
    }

    setFriendKeyword("");
  }, [friendSearchOpen]);

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
        <SidebarContent className="overflow-hidden">
          {/* New Chat */}
          <SidebarGroup>
            <SidebarGroupContent>
              <CreateNewChat />
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Group Chat */}
          <SidebarGroup className="min-h-0 flex-1">
            <div className="flex items-center justify-between">
              <SidebarGroupLabel className="uppercase">nhóm chat</SidebarGroupLabel>
              <div className="flex items-center gap-2">
                <JoinGroupChatModal />
                <NewGroupChatModal />
              </div>
            </div>

            <SidebarGroupContent className="min-h-0 flex-1">
              {convoLoading ? <ConversationSkeleton /> : <GroupChatList />}
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Dirrect Message */}
          <SidebarGroup className="min-h-0 flex-1">
            <div className="flex items-center justify-between">
              <SidebarGroupLabel className="uppercase">bạn bè</SidebarGroupLabel>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFriendSearchOpen((prev) => !prev)}
                  className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full hover:bg-sidebar-accent"
                  aria-label="Tìm kiếm bạn bè"
                >
                  <Search className="size-4" />
                </button>
                <AddFriendModal />
              </div>
            </div>

            <SidebarGroupContent className="min-h-0 flex-1">
              {friendSearchOpen ? (
                <div className="px-2 pb-2">
                  <Input
                    value={friendKeyword}
                    onChange={(event) => setFriendKeyword(event.target.value)}
                    placeholder="Tìm theo tên hoặc username..."
                    className="glass border-border/50 focus:border-primary/50 transition-smooth"
                  />
                </div>
              ) : null}

              {convoLoading ? (
                <ConversationSkeleton />
              ) : (
                <DirectMessageList keyword={friendKeyword} />
              )}
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
