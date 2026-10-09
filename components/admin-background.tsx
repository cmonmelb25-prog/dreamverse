'use client';

export function AdminBackground() {
    return (
        <div
            className="fixed top-0 left-0 w-full h-full -z-10"
            style={{
                backgroundImage: `url('https://i.imgur.com/nuNfrhh.jpeg')`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
            }}
        />
    );
}
