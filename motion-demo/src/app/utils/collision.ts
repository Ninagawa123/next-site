interface Circle {
    id: number;
    x: number;
    y: number;
    size: number;
}

interface Dot {
    id: string;
    x: number;
    y: number;
}

export const checkCollision = (circle1: Circle, circle2: Circle): boolean => {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (circle1.size + circle2.size) / 2;
};

export const createDot = (circle1: Circle, circle2: Circle): Dot => {
    const x = (circle1.x + circle2.x) / 2;
    const y = (circle1.y + circle2.y) / 2;
    const id = `${x}_${y}_${Date.now()}_${Math.random()}`;
    return {
        id,
        x,
        y,
    };
};