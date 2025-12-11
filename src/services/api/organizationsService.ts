import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from '../../constants/firebase';
import { OrganizationProfile, Organization, CreateOrganizationData } from '../../types/models/organization';

class OrganizationsService {
  private collectionName = COLLECTIONS.ORGANIZATIONS;

  /**
   * Create a new organization profile in the organizations collection
   */
  async createOrganizationProfile(uid: string, data: Partial<CreateOrganizationData>): Promise<void> {
    const orgRef = doc(db, this.collectionName, uid);

    const orgProfile: OrganizationProfile = {
      uid,
      email: data.email!,
      role: 'organization',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),

      // Basic Information
      organizationName: data.organizationName!,
      organizationType: data.organizationType!,
      registrationNumber: data.registrationNumber!,
      yearEstablished: data.yearEstablished!,
      ...(data.website && { website: data.website }),
      ...(data.photoURL && { photoURL: data.photoURL }),

      // Contact Information
      contactPerson: data.contactPerson!,
      designation: data.designation!,
      primaryEmail: data.primaryEmail!,
      primaryPhone: data.primaryPhone!,
      ...(data.secondaryPhone && { secondaryPhone: data.secondaryPhone }),

      // Address
      address: data.address!,

      // Sports & Players
      sports: data.sports!,
      numberOfPlayers: data.numberOfPlayers!,
      ageGroups: data.ageGroups!,

      // Facilities
      facilities: data.facilities!,

      // Additional Information
      ...(data.achievements && { achievements: data.achievements }),
      ...(data.socialMedia && { socialMedia: data.socialMedia }),

      // Declaration
      termsAccepted: data.termsAccepted!,

      // System fields
      isActive: true,
      isVerified: false
    };

    await setDoc(orgRef, orgProfile);
  }

  /**
   * Get organization profile by UID
   */
  async getOrganizationProfile(uid: string): Promise<Organization | null> {
    try {
      const orgRef = doc(db, this.collectionName, uid);
      const orgDoc = await getDoc(orgRef);

      if (!orgDoc.exists()) {
        return null;
      }

      return { id: orgDoc.id, ...orgDoc.data() } as unknown as Organization;
    } catch (error) {
      console.error('Error getting organization profile:', error);
      throw error;
    }
  }

  /**
   * Update organization profile
   */
  async updateOrganizationProfile(uid: string, updates: Partial<OrganizationProfile>): Promise<void> {
    try {
      const orgRef = doc(db, this.collectionName, uid);
      await updateDoc(orgRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating organization profile:', error);
      throw error;
    }
  }
}

export const organizationsService = new OrganizationsService();
