function doLineSegmentsIntersect(p1, p2, p3, p4) {
    // Helper to calculate cross product
    function orientation(p, q, r) {
        const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
        if (val === 0) return 0; // Collinear
        return val > 0 ? 1 : 2; // Clockwise or counterclockwise
    }

    const o1 = orientation(p1, p2, p3);
    const o2 = orientation(p1, p2, p4);
    const o3 = orientation(p3, p4, p1);
    const o4 = orientation(p3, p4, p2);

    // General case
    if (o1 !== o2 && o3 !== o4) return true;

    return false;
}

function doesRayIntersectRectangle(rayStart, rayEnd, rect) {
    const rectEdges = [
        { x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y }, // Top edge
        { x1: rect.x + rect.width, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height }, // Right edge
        { x1: rect.x + rect.width, y1: rect.y + rect.height, x2: rect.x, y2: rect.y + rect.height }, // Bottom edge
        { x1: rect.x, y1: rect.y + rect.height, x2: rect.x, y2: rect.y }, // Left edge
    ];

    for (let edge of rectEdges) {
        if (doLineSegmentsIntersect(rayStart, rayEnd, { x: edge.x1, y: edge.y1 }, { x: edge.x2, y: edge.y2 })) {
            return true; // Ray intersects the rectangle
        }
    }

    return false; // No intersection
}


class Shape {
    constructor(x, y, width, height, rotation = 0, oscillating = false, amplitude = 50, frequency = 0.01) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.rotation = rotation;
        this.points = this.getBorderPoints();
        this.oscillating = oscillating; // Whether this shape is oscillating
        this.amplitude = amplitude; // Amplitude of the sine wave
        this.frequency = frequency; // Frequency of the sine wave
        this.time = 0; // Time counter for the sine wave
    }

    isBlockingLine(dot1, dot2) {
        const p1 = { x: dot1.x, y: dot1.y };
        const p2 = { x: dot2.x, y: dot2.y };
    
        // Check against all edges of the shape
        for (let i = 0; i < this.points.length; i++) {
            const p3 = this.points[i];
            const p4 = this.points[(i + 1) % this.points.length]; // Wrap around to form closed shape
    
            if (doLineSegmentsIntersect(p1, p2, p3, p4)) {
                return true; // Shape blocks the line
            }
        }
        return false; // No blocking
    }

    updateOscillation() {
        if (this.oscillating) {
            // Update the x position based on a sine wave
            this.x = this.originalX + Math.sin(this.time) * this.amplitude;
            this.points = this.getBorderPoints(); // Recalculate border points
            this.time += this.frequency; // Increment time
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.translate(-this.width / 2, -this.height / 2);
        ctx.beginPath();
        ctx.rect(0, 0, this.width, this.height);
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.restore();
    }

    getBorderPoints(numPoints = 500) {

        const x = this.x;
        const y = this.y;
        const rotation = this.rotation;
        const width = this.width;
        const height = this.height;

        // Convert rotation to radians if it's in degrees
        const radians = rotation;
        
        // Define the unrotated corners of the rectangle (relative to the center)
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        const corners = [
            { x: -halfWidth, y: -halfHeight }, // Bottom-left
            { x: halfWidth, y: -halfHeight },  // Bottom-right
            { x: halfWidth, y: halfHeight },   // Top-right
            { x: -halfWidth, y: halfHeight },  // Top-left
        ];
        
        // Function to rotate a point around (x, y)
        function rotatePoint(px, py) {
            const dx = px - x;
            const dy = py - y;
            const newX = x + dx * Math.cos(radians) - dy * Math.sin(radians);
            const newY = y + dx * Math.sin(radians) + dy * Math.cos(radians);
            return { x: newX + halfWidth, y: newY + halfHeight };
        }
    
        // Rotate all corners
        const rotatedCorners = corners.map(corner => rotatePoint(corner.x + x, corner.y + y));
        
        // Get the points along each edge of the rectangle
        const points = [];

        
        // Interpolate between the rotated corners to get points along each edge
        function getEdgePoints(x1, y1, x2, y2) {
            const edgePoints = [];
            for (let i = 0; i < numPoints; i++) {
                const t = i / (numPoints - 1);
                const x = x1 + t * (x2 - x1);
                const y = y1 + t * (y2 - y1);
                edgePoints.push({ x, y });
            }
            return edgePoints;
        }
    
        // Add points along each edge
        for (let i = 0; i < rotatedCorners.length; i++) {
            const nextIndex = (i + 1) % rotatedCorners.length;
            const p1 = rotatedCorners[i];
            const p2 = rotatedCorners[nextIndex];
            const edgePoints = getEdgePoints(p1.x, p1.y, p2.x, p2.y);
            points.push(...edgePoints);
        }
    
        return points;
    }

    // Find the nearest point on the boundary of the shape from a dot
    nearestBoundaryPoint(dot) {
        let closestPoint = null;
        let minDistance = Infinity; // Start with a large number to find the minimum

        // Iterate through the array of points
        for (let point of this.points) {
            
            // Calculate the Euclidean distance
            const dx = point.x - dot.x;
            const dy = point.y - dot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Update the closest point if we find a smaller distance
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point;
            }
        }

        if (closestPoint == null) {
            return {x: Infinity, y: Infinity}
        }

        return { x: closestPoint.x, y: closestPoint.y};
    }

    // Check if the dot is within 20px of the shape
    isInRange(dot, range = 60) {
        const nearestPoint = this.nearestBoundaryPoint(dot);
        const dx = dot.x - nearestPoint.x;
        const dy = dot.y - nearestPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < range;
    }
}

class Dot {
    constructor(x, y, radius = 5) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.velocityX = 0;
        this.velocityY = 0;
        this.accelerationX = 0;
        this.accelerationY = 0;
        this.friction = 0.92;
    }

    applyForce(forceX, forceY) {
        this.accelerationX += forceX;
        this.accelerationY += forceY;
    }

    update() {
        this.velocityX += this.accelerationX;
        this.velocityY += this.accelerationY;
        this.velocityX *= this.friction;
        this.velocityY *= this.friction;
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.accelerationX = 0;
        this.accelerationY = 0;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
    }

    distanceTo(dot) {
        const dx = this.x - dot.x;
        const dy = this.y - dot.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Calculate force between this dot and another dot
    calculateForce(dot, shapes) {
        const distance = this.distanceTo(dot);
        const radiusThreshold = 60;

        for (let shape of shapes) {
            const rect = {
                x: shape.x - shape.width / 2,
                y: shape.y - shape.height / 2,
                widht: shape.widht,
                height: shape.height,
            };

            if (doesRayIntersectRectangle({ x: this.x, y: this.y }, { x: dot.x, y: dot.y }, rect)) {
                return { forceX: 0, forceY: 0 };
            }
        }


        if (distance < radiusThreshold && distance !== 0) {
            const forceMagnitude = (1 / distance) * 20;

            const dx = this.x - dot.x;
            const dy = this.y - dot.y;
            const angle = Math.atan2(dy, dx);

            const forceX = forceMagnitude * Math.cos(angle);
            const forceY = forceMagnitude * Math.sin(angle);

            return { forceX, forceY };
        }
        return { forceX: 0, forceY: 0 };
    }

    applyBoundaryForce(canvasWidth, canvasHeight) {
        const boundaryThreshold = 30;
        let forceX = 0;
        let forceY = 0;

        if (this.x < boundaryThreshold) {
            forceX = 2 ** ((boundaryThreshold - this.x) * 0.01);
        } else if (this.x > canvasWidth - boundaryThreshold) {
            forceX = -(2 ** ((this.x - (canvasWidth - boundaryThreshold)) * 0.01));
        }

        if (this.y < boundaryThreshold) {
            forceY = 2 ** ((boundaryThreshold - this.y) * 0.01);
        } else if (this.y > canvasHeight - boundaryThreshold) {
            forceY = -(2 ** ((this.y - (canvasHeight - boundaryThreshold)) * 0.01));
        }

        this.applyForce(forceX, forceY);
    }

    // Apply force to push dot away from shapes
    applyShapeCollisionForce(shapes, ctx) {
        const forceMultiplier = 3; // Force multiplier as used for walls
        for (let shape of shapes) {
            if (shape.isInRange(this)) {
                // Calculate the nearest boundary point
                const nearestPoint = shape.nearestBoundaryPoint(this);
                ctx.beginPath();
                ctx.arc(nearestPoint.x, nearestPoint.y, this.radius, 0, 2 * Math.PI);
                ctx.fillStyle = 'green';
                ctx.fill();
                const dx = this.x - nearestPoint.x;
                const dy = this.y - nearestPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // If too close, apply force based on the distance
                if (distance < this.radius + 2) {
                    const forceMagnitude = (this.radius + 2 - distance) * forceMultiplier; // Force multiplier for pushing the dot away

                    const angle = Math.atan2(dy, dx);
                    const forceX = forceMagnitude * Math.cos(angle);
                    const forceY = forceMagnitude * Math.sin(angle);

                    this.applyForce(forceX, forceY);
                }
            }
        }
    }
}



        // Get the canvas element and its context
        const canvas = document.getElementById('myCanvas');
        const ctx = canvas.getContext('2d');

        // Create an array to hold 200 dots
        const dots = [];
        
        // Initialize 200 dots with random starting positions
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * canvas.width;  // Random x position within the canvas width
            const y = Math.random() * canvas.height; // Random y position within the canvas height
            dots.push(new Dot(x, y));
        }

        // Create a list of custom shapes (rectangles with rotation)
        const shapes = [
            new Shape(300, 160, 550, 20, -(Math.PI / 4)),   // Example shape 1 (rotated 30 degrees)
            new Shape(300, 640, 550, 20, Math.PI / 4)   // Example shape 2 (rotated 45 degrees)
        ];

        const oscillatingShape = new Shape(900, 0, 20, 1000, 0, true, 100, 0.05); // Oscillates along x-axis
        oscillatingShape.originalX = oscillatingShape.x; // Store original x position
        shapes.push(oscillatingShape);

        // Function to animate the simulation
        function animate() {
            // Clear the canvas on each frame
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let shape of shapes) {
                if (shape.oscillating) {
                    shape.updateOscillation(); // Update the shape's position if oscillating
                }
                shape.draw(ctx);
            }

            // Loop through each dot to calculate and apply forces from neighbors
            for (let i = 0; i < dots.length; i++) {
                const dot = dots[i];

                // Loop through all other dots and calculate the force between them
                for (let j = 0; j < dots.length; j++) {
                    if (i !== j) { // Don't calculate force with itself
                        const otherDot = dots[j];
                        const { forceX, forceY } = dot.calculateForce(otherDot, shapes);

                        // Apply the calculated force to the dot
                        dot.applyForce(forceX, forceY);
                    }
                }

                // Check collision with each shape and apply a force similar to boundary force
                dot.applyShapeCollisionForce(shapes, ctx);

                // Apply boundary force to keep the dot inside the canvas
                dot.applyBoundaryForce(canvas.width, canvas.height);

                // Update the dot's state
                dot.update();

                // Draw the dot on the canvas
                dot.draw(ctx);
            }

            // Draw all shapes on the canvas
            for (let shape of shapes) {
                shape.draw(ctx);
            }

            // Repeat the animation
            requestAnimationFrame(animate);
        }

        // Start the animation
        animate();