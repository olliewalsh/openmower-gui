import {Outlet, useMatches, useNavigate} from "react-router-dom";
import {Layout, Typography} from "antd";
import {
    ClockCircleOutlined,
    HeatMapOutlined,
    MessageOutlined,
    RobotOutlined,
    RocketOutlined,
    SettingOutlined,
    MenuOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import {useCallback, useEffect, useState} from "react";
import {MowerStatus} from "../components/MowerStatus.tsx";
import {useIsMobile} from "../hooks/useIsMobile";
import {COLORS} from "../theme/colors.ts";

const navItems = [
    {key: '/openmower', label: 'Dashboard', icon: <RobotOutlined/>},
    {key: '/map', label: 'Map', icon: <HeatMapOutlined/>},
    {key: '/schedule', label: 'Schedule', icon: <ClockCircleOutlined/>},
    {key: '/setup', label: 'Setup', icon: <RocketOutlined/>},
    {key: '/settings', label: 'Settings', icon: <SettingOutlined/>},
    {key: '/logs', label: 'Logs', icon: <MessageOutlined/>},
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

export default function Root() {
    const route = useMatches();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [railExpanded, setRailExpanded] = useState(false);

    useEffect(() => {
        if (route.length === 1 && route[0].pathname === "/") {
            navigate({pathname: '/openmower'});
        }
    }, [route, navigate]);

    const currentPath = route.length > 1 ? route[1].pathname : '/openmower';
    const pageTitle = pageTitles[currentPath] ?? 'OpenMower';

    const handleNavigate = useCallback((key: string) => {
        navigate({pathname: key});
        setSidebarOpen(false);
    }, [navigate]);

    if (isMobile) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100dvh',
                minHeight: '100dvh',
                maxHeight: '100dvh',
                background: COLORS.bgBase,
                overflow: 'hidden',
            }}>
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

                {/* Mobile Slide-over Backdrop */}
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, top: 48,
                        background: 'rgba(0,0,0,0.5)', zIndex: 199,
                        opacity: sidebarOpen ? 1 : 0,
                        pointerEvents: sidebarOpen ? 'auto' : 'none',
                        transition: 'opacity 0.25s ease-out',
                    }}
                />
                {/* Mobile Slide-over Nav */}
                <nav style={{
                    position: 'fixed', top: 48, left: 0, bottom: 56,
                    width: 260, background: COLORS.bgCard, zIndex: 200,
                    borderRight: `1px solid ${COLORS.border}`,
                    overflowY: 'auto',
                    transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                    transition: 'transform 0.25s ease-out',
                }}>
                    <div style={{padding: '8px 0'}}>
                        {navItems.map(item => {
                            const isActive = currentPath === item.key;
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => handleNavigate(item.key)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        width: '100%',
                                        padding: '12px 20px',
                                        background: isActive ? COLORS.primaryBg : 'transparent',
                                        border: 'none',
                                        borderLeft: isActive ? `3px solid ${COLORS.primary}` : '3px solid transparent',
                                        color: isActive ? COLORS.primary : COLORS.text,
                                        fontSize: 15,
                                        cursor: 'pointer',
                                        transition: 'background 0.15s, color 0.15s',
                                    }}
                                >
                                    <span style={{fontSize: 18}}>{item.icon}</span>
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* Mobile Content */}
                <main style={{flex: 1, overflow: 'auto', padding: '8px 8px 0', minHeight: 0}}>
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

    // Desktop layout — custom icon rail
    return (
        <div style={{display: 'flex', height: '100vh', minHeight: '100vh', maxHeight: '100vh', overflow: 'hidden'}}>
            <nav
                onMouseEnter={() => setRailExpanded(true)}
                onMouseLeave={() => setRailExpanded(false)}
                style={{
                    width: railExpanded ? 200 : 60,
                    minWidth: railExpanded ? 200 : 60,
                    background: COLORS.bgCard,
                    borderRight: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'width 0.2s ease, min-width 0.2s ease',
                    overflow: 'hidden',
                    flexShrink: 0,
                    height: '100%',
                }}
            >
                {/* Logo area */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: railExpanded ? 'flex-start' : 'center',
                    gap: 10,
                    padding: railExpanded ? '20px 16px' : '20px 0',
                    borderBottom: `1px solid ${COLORS.borderSubtle}`,
                    overflow: 'hidden',
                    height: 64,
                    flexShrink: 0,
                }}>
                    <RobotOutlined style={{fontSize: 24, color: COLORS.primary, flexShrink: 0}}/>
                    {railExpanded && (
                        <Typography.Text strong style={{
                            fontSize: 18, color: COLORS.text, whiteSpace: 'nowrap',
                        }}>
                            Mowgli
                        </Typography.Text>
                    )}
                </div>

                {/* Nav items */}
                <div style={{flex: 1, padding: '8px 0', overflowY: 'auto'}}>
                    {navItems.map(item => {
                        const isActive = currentPath === item.key;
                        return (
                            <button
                                key={item.key}
                                onClick={() => handleNavigate(item.key)}
                                aria-label={item.label}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    width: '100%',
                                    padding: '10px 0',
                                    paddingLeft: railExpanded ? 16 : 0,
                                    justifyContent: railExpanded ? 'flex-start' : 'center',
                                    background: isActive ? COLORS.primaryBg : 'transparent',
                                    border: 'none',
                                    borderLeft: isActive ? `3px solid ${COLORS.primary}` : '3px solid transparent',
                                    color: isActive ? COLORS.primary : COLORS.text,
                                    fontSize: 14,
                                    cursor: 'pointer',
                                    transition: 'background 0.15s, color 0.15s, padding-left 0.2s ease',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseOver={(e) => {
                                    if (!isActive) e.currentTarget.style.background = COLORS.bgElevated;
                                }}
                                onMouseOut={(e) => {
                                    if (!isActive) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <span style={{fontSize: 22, flexShrink: 0, width: 28, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}>{item.icon}</span>
                                {railExpanded && (
                                    <span>{item.label}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Main content area */}
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minWidth: 0}}>
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
                    flexShrink: 0,
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
                <main style={{flex: 1, padding: '10px 24px 0 24px', overflow: 'auto', minHeight: 0}}>
                    <Outlet/>
                </main>
            </div>
        </div>
    );
}
