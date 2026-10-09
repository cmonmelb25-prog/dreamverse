'use client';

/**
 * Settings Page Immersive Background.
 * Default export used for stable dynamic chunk loading.
 */
export function SettingsBackgroundVideo() {
    return (
        <div
            className="fixed top-0 left-0 w-full h-full bg-cover bg-center -z-10"
            style={{
                backgroundImage: `url('https://i.imgur.com/h609jiF.jpg')`,
            }}
        />
    );
}

export default SettingsBackgroundVideo;
