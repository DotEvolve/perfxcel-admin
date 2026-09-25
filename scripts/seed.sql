INSERT INTO perfxcel.categories (name) VALUES ('Leadership'), ('IT'), ('Finance');
INSERT INTO perfxcel.cities (name) VALUES ('Dubai'), ('London'), ('New York');
INSERT INTO perfxcel.associations (name) VALUES ('PMI'), ('SHRM');

INSERT INTO perfxcel.courses (title, description, objectives, target_audience, is_published, category_id, city_id, association_id)
VALUES 
('Advanced Leadership Bootcamp', 'A comprehensive course on modern leadership.', 'Learn to lead teams effectively.', 'Mid to Senior Managers', true, (SELECT id FROM perfxcel.categories WHERE name = 'Leadership' LIMIT 1), (SELECT id FROM perfxcel.cities WHERE name = 'Dubai' LIMIT 1), (SELECT id FROM perfxcel.associations WHERE name = 'PMI' LIMIT 1)),
('Cloud Computing Fundamentals', 'Introduction to AWS and Azure.', 'Understand cloud architecture.', 'IT Professionals', true, (SELECT id FROM perfxcel.categories WHERE name = 'IT' LIMIT 1), (SELECT id FROM perfxcel.cities WHERE name = 'London' LIMIT 1), (SELECT id FROM perfxcel.associations WHERE name = 'SHRM' LIMIT 1)),
('Corporate Finance 101', 'Basics of corporate finance and valuation.', 'Analyze financial statements.', 'Finance Analysts', false, (SELECT id FROM perfxcel.categories WHERE name = 'Finance' LIMIT 1), (SELECT id FROM perfxcel.cities WHERE name = 'New York' LIMIT 1), NULL);
