import {useHighLevelStatus} from "../hooks/useHighLevelStatus.ts";
import {Badge, Space, Typography} from "antd";
import {PoweroffOutlined, WifiOutlined} from "@ant-design/icons"
import {stateRenderer} from "./utils.tsx";
import {useThemeMode} from "../theme/ThemeContext.tsx";

const pulseKeyframes = `
@keyframes mowerPulseGreen {
    0%, 100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.6); }
    50% { box-shadow: 0 0 0 4px rgba(82, 196, 26, 0); }
}
@keyframes mowerPulseRed {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.6); }
    50% { box-shadow: 0 0 0 4px rgba(255, 77, 79, 0); }
}
`;

const statusColor = (state: string | undefined, colors: {primary: string; warning: string; danger: string}): string => {
    switch (state) {
        case "MOWING":
        case "DOCKING":
        case "UNDOCKING":
            return colors.primary;
        case "IDLE":
            return colors.warning;
        default:
            return colors.danger;
    }
};

export const MowerStatus = () => {
    const {colors} = useThemeMode();
    const {highLevelStatus} = useHighLevelStatus();
    const gpsPercent = Math.round((highLevelStatus.GpsQualityPercent ?? 0) * 100);
    const batteryPercent = Math.round((highLevelStatus.BatteryPercent ?? 0) * 100);

    const isMowing = highLevelStatus.StateName === "MOWING" || highLevelStatus.StateName === "DOCKING" || highLevelStatus.StateName === "UNDOCKING";
    const isEmergency = !!highLevelStatus.Emergency;
    const pulseAnimation = isEmergency
        ? 'mowerPulseRed 1.5s ease-in-out infinite'
        : isMowing
            ? 'mowerPulseGreen 2s ease-in-out infinite'
            : 'none';

    const hasArea = highLevelStatus.CurrentArea !== undefined && highLevelStatus.CurrentArea >= 0;
    const hasProgress = isMowing && highLevelStatus.CurrentPathIndex !== undefined && highLevelStatus.CurrentPath !== undefined && highLevelStatus.CurrentPath > 0;
    const progressPercent = hasProgress
        ? Math.round(((highLevelStatus.CurrentPathIndex ?? 0) / (highLevelStatus.CurrentPath ?? 1)) * 100)
        : null;

    return (
        <>
            <style>{pulseKeyframes}</style>
            <Space size="small" style={{flexShrink: 0}}>
                <Space size={4}>
                    <Badge
                        color={statusColor(highLevelStatus.StateName, colors)}
                        style={{animation: pulseAnimation, borderRadius: '50%'}}
                    />
                    <Typography.Text style={{fontSize: 12, color: colors.text, whiteSpace: 'nowrap'}}>
                        {stateRenderer(highLevelStatus.StateName)}
                    </Typography.Text>
                </Space>
                {isMowing && hasArea && (
                    <Typography.Text style={{fontSize: 11, color: colors.primary, whiteSpace: 'nowrap'}}>
                        A{(highLevelStatus.CurrentArea ?? 0) + 1}
                        {progressPercent !== null ? ` ${progressPercent}%` : ''}
                    </Typography.Text>
                )}
                <Space size={4}>
                    <WifiOutlined style={{color: gpsPercent > 0 ? colors.primary : colors.danger, fontSize: 13}}/>
                    <Typography.Text style={{fontSize: 12, color: colors.text}}>
                        {gpsPercent}%
                    </Typography.Text>
                </Space>
                <Space size={4}>
                    <PoweroffOutlined style={{
                        color: highLevelStatus.IsCharging ? colors.primary : colors.muted,
                        fontSize: 13,
                    }}/>
                    <Typography.Text style={{fontSize: 12, color: colors.text}}>
                        {batteryPercent}%
                    </Typography.Text>
                </Space>
            </Space>
        </>
    );
}
