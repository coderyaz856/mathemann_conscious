const { db } = require('../config/fileDB');

// Create a meeting request (student)
exports.createMeetingRequest = async (req, res) => {
    try {
        const { teacherId, subject, message, preferredDate, preferredTime } = req.body;
        const studentId = req.user.id;

        const teacher = db.findById('users', teacherId);
        if (!teacher || teacher.role !== 'teacher') {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        const request = db.create('meetingRequests', {
            student: studentId,
            teacher: teacherId,
            subject,
            message,
            preferredDate,
            preferredTime,
            status: 'pending'
        });

        res.status(201).json({ message: 'Meeting request created', request });
    } catch (error) {
        res.status(500).json({ message: 'Error creating meeting request', error: error.message });
    }
};

// Get pending requests for teacher
exports.getPendingRequestsForTeacher = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const requests = db.find('meetingRequests').filter(r => r.teacher === teacherId);
        const users = db.find('users');

        const populatedRequests = requests.map(r => {
            const student = users.find(u => u._id === r.student);
            return {
                ...r,
                student: student ? { _id: student._id, name: student.name, email: student.email } : null
            };
        });

        res.status(200).json(populatedRequests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching requests', error: error.message });
    }
};

// Get my requests (student)
exports.getMyRequests = async (req, res) => {
    try {
        const studentId = req.user.id;
        const requests = db.find('meetingRequests').filter(r => r.student === studentId);
        const users = db.find('users');

        const populatedRequests = requests.map(r => {
            const teacher = users.find(u => u._id === r.teacher);
            return {
                ...r,
                teacher: teacher ? { _id: teacher._id, name: teacher.name, email: teacher.email } : null
            };
        });

        res.status(200).json(populatedRequests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching requests', error: error.message });
    }
};

// Update request status (teacher)
exports.updateRequestStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status, responseMessage } = req.body;
        const teacherId = req.user.id;

        const request = db.findById('meetingRequests', requestId);
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.teacher !== teacherId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const updated = db.findByIdAndUpdate('meetingRequests', requestId, {
            status,
            responseMessage,
            respondedAt: new Date().toISOString()
        }, { new: true });

        res.status(200).json({ message: 'Request updated', request: updated });
    } catch (error) {
        res.status(500).json({ message: 'Error updating request', error: error.message });
    }
};

// Cancel a request (student)
exports.cancelRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const studentId = req.user.id;

        const request = db.findById('meetingRequests', requestId);
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.student !== studentId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const updated = db.findByIdAndUpdate('meetingRequests', requestId, {
            status: 'cancelled'
        }, { new: true });

        res.status(200).json({ message: 'Request cancelled', request: updated });
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling request', error: error.message });
    }
};
