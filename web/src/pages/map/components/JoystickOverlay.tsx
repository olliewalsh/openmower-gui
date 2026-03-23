import {Joystick} from "react-joystick-component";
import {IJoystickUpdateEvent} from "react-joystick-component/build/lib/Joystick";

interface JoystickOverlayProps {
    visible: boolean;
    onMove: (event: IJoystickUpdateEvent) => void;
    onStop: () => void;
}

export const JoystickOverlay = ({visible, onMove, onStop}: JoystickOverlayProps) => {
    if (!visible) return null;
    return (
        <div style={{position: "absolute", bottom: 30, right: 30, zIndex: 100}}>
            <Joystick move={onMove} stop={onStop}/>
        </div>
    );
};
