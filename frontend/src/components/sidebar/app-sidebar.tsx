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
import { useEffect, useRef, useState } from "react";
import { useFriendStore } from "@/stores/useFriendStore";
import { Input } from "../ui/input";
import { useNavigate } from "react-router";

const SIDEBAR_SPLIT_STORAGE_KEY = "chat-sidebar-split";
const MIN_SECTION_PERCENT = 0;
const MAX_SECTION_PERCENT = 97;
const DEFAULT_GROUP_SECTION_PERCENT = 50;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore();
  const { convoLoading, setActiveConversation } = useChatStore();
  const navigate = useNavigate();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [friendSearchOpen, setFriendSearchOpen] = useState(false);
  const [friendKeyword, setFriendKeyword] = useState("");
  const [groupSectionPercent, setGroupSectionPercent] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_GROUP_SECTION_PERCENT;
    }

    const savedValue = window.localStorage.getItem(SIDEBAR_SPLIT_STORAGE_KEY);
    const parsedValue = savedValue ? Number(savedValue) : Number.NaN;

    if (Number.isNaN(parsedValue)) {
      return DEFAULT_GROUP_SECTION_PERCENT;
    }

    return Math.min(MAX_SECTION_PERCENT, Math.max(MIN_SECTION_PERCENT, parsedValue));
  });
  const { fetchNotifications, unreadCount } = useNotificationStore();
  const { getFriends } = useFriendStore();
  const resizeAreaRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_SPLIT_STORAGE_KEY,
      groupSectionPercent.toString()
    );
  }, [groupSectionPercent]);

  const handleResizeStart = () => {
    const resizeArea = resizeAreaRef.current;

    if (!resizeArea) {
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      const bounds = resizeArea.getBoundingClientRect();
      const nextPercent = ((event.clientY - bounds.top) / bounds.height) * 100;

      setGroupSectionPercent(
        Math.min(MAX_SECTION_PERCENT, Math.max(MIN_SECTION_PERCENT, nextPercent))
      );
    };

    const stopResize = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopResize);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopResize);
  };

  const handleGoToChatHome = () => {
    setActiveConversation(null);
    navigate("/chat");
  };

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
                onClick={handleGoToChatHome}
              >
                <div className="flex w-full items-center justify-between px-2">
                  <h1 className="text-xl font-bold text-white">ChatApp</h1>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setNotificationOpen(true);
                    }}
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
          <div
            ref={resizeAreaRef}
            className="flex min-h-0 flex-1 flex-col"
          >
            {/* Group Chat */}
            <SidebarGroup
              className="min-h-0 overflow-hidden"
              style={{ flex: `0 0 calc(${groupSectionPercent}% - 8px)` }}
            >
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

            <div className="px-3 py-1">
              <button
                type="button"
                onMouseDown={handleResizeStart}
                className="group flex h-3 w-full cursor-row-resize items-center justify-center rounded-md"
                aria-label="Điều chỉnh chiều cao danh sách nhóm chat và bạn bè"
              >
                <div className="h-1 w-full rounded-full bg-sidebar-border/80 transition-colors group-hover:bg-sidebar-accent-foreground/40" />
              </button>
            </div>

            {/* Dirrect Message */}
            <SidebarGroup
              className="min-h-0 overflow-hidden"
              style={{ flex: `0 0 calc(${100 - groupSectionPercent}% - 8px)` }}
            >
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
          </div>
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
