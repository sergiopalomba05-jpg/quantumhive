export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  room?: string;
  alternateLink?: string;
  courseState?: string;
}

export interface ClassroomAnnouncement {
  id: string;
  courseId: string;
  text: string;
  alternateLink?: string;
  creationTime: string;
}

export interface ClassroomCourseWork {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  alternateLink?: string;
  creationTime: string;
  dueDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
}

export async function fetchClassroomCourses(accessToken: string): Promise<ClassroomCourse[]> {
  try {
    const response = await fetch(
      "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Classroom API courses responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.courses || [];
  } catch (error) {
    console.error("Error in fetchClassroomCourses:", error);
    throw error;
  }
}

export async function fetchCourseAnnouncements(accessToken: string, courseId: string): Promise<ClassroomAnnouncement[]> {
  try {
    const response = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/announcements?pageSize=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Classroom API announcements responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.announcements || [];
  } catch (error) {
    console.error(`Error in fetchCourseAnnouncements for ${courseId}:`, error);
    return [];
  }
}

export async function fetchCourseWork(accessToken: string, courseId: string): Promise<ClassroomCourseWork[]> {
  try {
    const response = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?pageSize=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Classroom API courseWork responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.courseWork || [];
  } catch (error) {
    console.error(`Error in fetchCourseWork for ${courseId}:`, error);
    return [];
  }
}
