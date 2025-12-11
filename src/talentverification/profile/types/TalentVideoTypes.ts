export interface TalentVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  sport: string;
  skillCategory: string;
  uploadDate: Date;
  duration: number;
  viewCount: number;
}

export interface VideoModalProps {
  video: TalentVideo | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface TalentVideosSectionProps {
  videos: TalentVideo[];
  isOwner: boolean;
  onAddVideo?: () => void;
  onEditVideo?: (video: TalentVideo) => void;
  onDeleteVideo?: (videoId: string) => void;
  onVideoClick?: (video: TalentVideo) => void;
}

export interface VideoFormData {
  title: string;
  description: string;
  sport: string;
  skillCategory: string;
  videoFile?: File;
}