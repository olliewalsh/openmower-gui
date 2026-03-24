import {useHighLevelStatus} from "../hooks/useHighLevelStatus.ts";
import {Badge, Space, Typography} from "antd";
import {PoweroffOutlined, WifiOutlined} from "@ant-design/icons"
import {stateRenderer} from "./utils.tsx";
import {COLORS} from "../theme/colors.ts";

const statusColor = (state: string | undefined): string => {
    switch (state) {
        case "MOWING":
        case "DOCKING":
        case "UNDOCKING":
            return COLORS.primary;
        case "IDLE":
            return COLORS.warning;
        default:
            return COLORS.danger;
    }
};

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

export const MowerStatus = () => {
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
                        color={statusColor(highLevelStatus.StateName)}
                        style={{animation: pulseAnimation, borderRadius: '50%'}}
                    />
                    <Typography.Text style={{fontSize: 12, color: COLORS.text, whiteSpace: 'nowrap'}}>
                        {stateRenderer(highLevelStatus.StateName)}
                    </Typography.Text>
                </Space>
                {isMowing && hasArea && (
                    <Typography.Text style={{fontSize: 11, color: COLORS.primary, whiteSpace: 'nowrap'}}>
                        A{(highLevelStatus.CurrentArea ?? 0) + 1}
                        {progressPercent !== null ? ` ${progressPercent}%` : ''}
                    </Typography.Text>
                )}
                <Space size={4}>
                    <WifiOutlined style={{color: gpsPercent > 0 ? COLORS.primary : COLORS.danger, fontSize: 13}}/>
                    <Typography.Text style={{fontSize: 12, color: COLORS.text}}>
                        {gpsPercent}%
                    </Typography.Text>
                </Space>
                <Space size={4}>
                    <PoweroffOutlined style={{
                        color: highLevelStatus.IsCharging ? COLORS.primary : COLORS.muted,
                        fontSize: 13,
                    }}/>
                    <Typography.Text style={{fontSize: 12, color: COLORS.text}}>
                        {batteryPercent}%
                    </Typography.Text>
                </Space>
            </Space>
        </>
    );
}
