import {Outlet, useMatches, useNavigate} from "react-router-dom";
import {Layout, Menu, MenuProps, Typography} from "antd";
import {
    ClockCircleOutlined,
    HeatMapOutlined,
    MessageOutlined,
    RobotOutlined,
    RocketFilled,
    RocketOutlined,
    SettingOutlined,
    MenuOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import {useCallback, useEffect, useState} from "react";
import {MowerStatus} from "../components/MowerStatus.tsx";
import {COLORS} from "../theme/colors.ts";

const menuItems: MenuProps['items'] = [
    {key: '/openmower', label: 'OpenMower', icon: <RobotOutlined/>},
    {key: '/setup', label: 'Setup', icon: <RocketOutlined/>},
    {key: '/settings', label: 'Settings', icon: <SettingOutlined/>},
    {key: '/map', label: 'Map', icon: <HeatMapOutlined/>},
    {key: '/schedule', label: 'Schedule', icon: <ClockCircleOutlined/>},
    {key: '/logs', label: 'Logs', icon: <MessageOutlined/>},
    {key: 'new', label: <span className={"beamerTrigger"}>What's new</span>, icon: <RocketFilled/>},
];

const bottomNavItems = [
    {key: '/openmower', label: 'Home', icon: <RobotOutlined/>},
    {key: '/map', label: 'Map', icon: <HeatMapOutlined/>},
    {key: '/schedule', label: 'Schedule', icon: <ClockCircleOutlined/>},
    {key: '/settings', label: 'Settings', icon: <SettingOutlined/>},
];

const pageTitles: Record<string, string> = {
    '/openmower': 'Dashboard',
    '/setup': 'Setup',
    '/settings': 'Settings',
    '/map': 'Map',
    '/schedule': 'Schedule',
    '/logs': 'Logs',
};

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
    );
    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener('change', handler);
        setIsMobile(mql.matches);
        return () => mql.removeEventListener('change', handler);
    }, []);
    return isMobile;
}

export default function Root() {
    const route = useMatches();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (route.length === 1 && route[0].pathname === "/") {
            navigate({pathname: '/openmower'});
        }
    }, [route, navigate]);

    const currentPath = route.length > 1 ? route[1].pathname : '/openmower';
    const pageTitle = pageTitles[currentPath] ?? 'OpenMower';

    const handleNavigate = useCallback((key: string) => {
        if (key !== 'new') {
            navigate({pathname: key});
            setSidebarOpen(false);
        }
    }, [navigate]);

    if (isMobile) {
        return (
            <div style={{display: 'flex', flexDirection: 'column', height: '100%', background: COLORS.bgBase}}>
                {/* Mobile Header */}
                <header style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 12px',
                    background: COLORS.bgCard,
                    borderBottom: `1px solid ${COLORS.border}`,
                    height: 48,
                    flexShrink: 0,
                    zIndex: 100,
                }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1}}>
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
                            style={{
                                background: 'none', border: 'none', color: COLORS.text,
                                fontSize: 18, padding: 4, cursor: 'pointer', flexShrink: 0,
                            }}
                        >
                            {sidebarOpen ? <CloseOutlined/> : <MenuOutlined/>}
                        </button>
                        <Typography.Text strong style={{
                            fontSize: 16, color: COLORS.text,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {pageTitle}
                        </Typography.Text>
                    </div>
                    <MowerStatus/>
                </header>

                {/* Mobile Slide-over Menu */}
                {sidebarOpen && (
                    <>
                        <div
                            onClick={() => setSidebarOpen(false)}
                            style={{
                                position: 'fixed', inset: 0, top: 48,
                                background: 'rgba(0,0,0,0.5)', zIndex: 199,
                            }}
                        />
                        <nav style={{
                            position: 'fixed', top: 48, left: 0, bottom: 56,
                            width: 260, background: COLORS.bgCard, zIndex: 200,
                            borderRight: `1px solid ${COLORS.border}`,
                            overflowY: 'auto',
                        }}>
                            <Menu
                                theme="dark"
                                mode="inline"
                                selectedKeys={[currentPath]}
                                onClick={(info) => handleNavigate(info.key)}
                                items={menuItems}
                                style={{borderInlineEnd: 'none'}}
                            />
                        </nav>
                    </>
                )}

                {/* Mobile Content */}
                <main style={{flex: 1, overflow: 'auto', padding: '8px 8px 0'}}>
                    <Outlet/>
                </main>

                {/* Mobile Bottom Tab Bar */}
                <nav style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    background: COLORS.bgCard,
                    borderTop: `1px solid ${COLORS.border}`,
                    height: 56,
                    flexShrink: 0,
                    zIndex: 100,
                }}>
                    {bottomNavItems.map(item => {
                        const isActive = currentPath === item.key;
                        return (
                            <button
                                key={item.key}
                                onClick={() => handleNavigate(item.key)}
                                aria-label={item.label}
                                aria-current={isActive ? 'page' : undefined}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 2,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: isActive ? COLORS.primary : COLORS.muted,
                                    fontSize: 20,
                                    borderTop: isActive ? `2px solid ${COLORS.primary}` : '2px solid transparent',
                                    transition: 'color 0.2s, border-color 0.2s',
                                    padding: 0,
                                }}
                            >
                                {item.icon}
                                <span style={{fontSize: 10, lineHeight: 1}}>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>
        );
    }

    // Desktop layout
    return (
        <Layout style={{height: "100%"}}>
            <Layout.Sider
                breakpoint="lg"
                collapsedWidth={60}
                onCollapse={(collapsed) => setSidebarOpen(!collapsed)}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: sidebarOpen ? 'center' : 'flex-start',
                    gap: 10,
                    padding: sidebarOpen ? '16px 0' : '16px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    overflow: 'hidden',
                }}>
                    <RobotOutlined style={{fontSize: 24, color: COLORS.primary, flexShrink: 0}}/>
                    {!sidebarOpen && (
                        <Typography.Text strong style={{fontSize: 18, color: COLORS.text, whiteSpace: 'nowrap'}}>
                            Mowgli
                        </Typography.Text>
                    )}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    onClick={(info) => handleNavigate(info.key)}
                    selectedKeys={route.map(r => r.pathname)}
                    items={menuItems}
                />
            </Layout.Sider>
            <Layout style={{height: "100%"}}>
                <Layout.Header style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '0 24px',
                    background: COLORS.bgCard,
                    borderBottom: `1px solid ${COLORS.border}`,
                    height: 48,
                    lineHeight: '48px',
                    overflow: 'hidden',
                }}>
                    <Typography.Text strong style={{
                        fontSize: 16, color: COLORS.text,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        flexShrink: 1, minWidth: 0,
                    }}>
                        {pageTitle}
                    </Typography.Text>
                    <MowerStatus/>
                </Layout.Header>
                <Layout.Content style={{padding: "10px 24px 0px 24px", height: "100%", overflow: "auto"}}>
                    <Outlet/>
                </Layout.Content>
            </Layout>
        </Layout>
    );
}
