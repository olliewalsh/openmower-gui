import {useState} from "react";
import type {Twist} from "../../../types/ros.ts";
import type {IJoystickUpdateEvent} from "react-joystick-component/build/lib/Joystick";

interface UseManualModeOptions {
    mowerAction: (action: string, params: Record<string, unknown>) => () => Promise<void>;
    joyStream: { sendJsonMessage: (msg: unknown) => void };
}

export function useManualMode({mowerAction, joyStream}: UseManualModeOptions) {
    const [manualMode, setManualMode] = useState<number | undefined>();

    const handleManualMode = async () => {
        await mowerAction("high_level_control", {Command: 3})();
        setManualMode(setInterval(() => {
            (async () => {
                await mowerAction("mow_enabled", {MowEnabled: 1, MowDirection: 0})();
            })();
        }, 10000));
    };

    const handleStopManualMode = async () => {
        await mowerAction("high_level_control", {Command: 2})();
        clearInterval(manualMode);
        setManualMode(undefined);
        await mowerAction("mow_enabled", {MowEnabled: 0, MowDirection: 0})();
    };

    const handleJoyMove = (event: IJoystickUpdateEvent) => {
        const msg: Twist = {
            Linear: {X: event.y ?? 0, Y: 0, Z: 0},
            Angular: {Z: (event.x ?? 0) * -1, X: 0, Y: 0},
        };
        joyStream.sendJsonMessage(msg);
    };

    const handleJoyStop = () => {
        const msg: Twist = {
            Linear: {X: 0, Y: 0, Z: 0},
            Angular: {Z: 0, X: 0, Y: 0},
        };
        joyStream.sendJsonMessage(msg);
    };

    return {manualMode, handleManualMode, handleStopManualMode, handleJoyMove, handleJoyStop};
}
